import { useCallback, useRef, useState } from "react";
import "./App.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Button, Group, Stack } from "@mantine/core";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import htmlToDocx from "html-to-docx";

function App() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editor = useCreateBlockNote({});
  const [fileName] = useState("MyDocument");

  const getEditorHtml = useCallback(async () => {
    if (!editorRef.current) return "";
    const wrapper = editorRef.current.cloneNode(true) as HTMLElement;
    wrapper
      .querySelectorAll('button, [role="toolbar"]')
      .forEach((el) => el.remove());
    wrapper
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((el) => el.remove());
    wrapper
      .querySelectorAll("[data-mantine-color-scheme]")
      .forEach((el) => el.removeAttribute("data-mantine-color-scheme"));

    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    document.body.appendChild(wrapper);

    wrapper.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const align = getComputedStyle(el).textAlign;
      if (align === "center" || align === "right" || align === "justify") {
        el.style.textAlign = align;
      }
    });

    const imgs = Array.from(wrapper.querySelectorAll<HTMLImageElement>("img"));
    for (const img of imgs) {
      const src = img.getAttribute("src");
      if (!src) continue;
      try {
        const resp = await fetch(src);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        img.setAttribute("src", dataUrl);
        const width = img.width || img.naturalWidth;
        if (width) {
          img.setAttribute("width", String(width));
          img.style.maxWidth = "100%";
        }
      } catch {}
    }

    const html = wrapper.innerHTML;
    wrapper.remove();
    return html;
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!editorRef.current) return;
    const canvas = await html2canvas(editorRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      removeContainer: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`${fileName}.pdf`);
  }, [fileName]);

  const handleExportDOCX = useCallback(async () => {
    const bodyHtml = await getEditorHtml();
    const css = `
      body { font-family: Inter, Arial, sans-serif; color: #222; font-size: 14px; }
      h1 { font-size: 32px; font-weight: 800; margin: 0 0 12px; }
      h2 { font-size: 28px; font-weight: 700; margin: 0 0 10px; }
      h3 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
      h4 { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
      h5 { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
      h6 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
      p { margin: 0 0 8px; }
      strong, b { font-weight: 700; }
      em, i { font-style: italic; }
      u { text-decoration: underline; }
      pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
      pre { background: #1f1f1f; color: #eeeeee; padding: 12px; border-radius: 8px; }
      code { background: #f2f2f2; padding: 2px 4px; border-radius: 4px; }
    `;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`;
    const fileBuffer = await htmlToDocx(fullHtml, undefined, {
      table: { row: { cantSplit: true } },
      page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
      ignoreWidth: false,
      ignoreHeight: false,
      font: "Inter, Arial, sans-serif",
    });
    const blob =
      fileBuffer instanceof Blob
        ? fileBuffer
        : new Blob([fileBuffer], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
    saveAs(blob, `${fileName}.docx`);
  }, [fileName, getEditorHtml]);

  const handleExportXLSX = useCallback(async () => {
    const text = editorRef.current?.innerText ?? "";
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = lines.map((line) => ({ Content: line }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Document");
    const xlsxArrayBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([xlsxArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${fileName}.xlsx`);
  }, [fileName]);

  return (
    <Stack p="lg" gap="md">
      <Group>
        <Button onClick={handleExportPDF}>Export PDF</Button>
        <Button onClick={handleExportDOCX}>Export DOCX</Button>
        <Button onClick={handleExportXLSX}>Export XLSX</Button>
      </Group>
      <div
        ref={editorRef}
        style={{ background: "white", padding: 16, borderRadius: 8 }}
      >
        <BlockNoteView editor={editor} theme="light" />
      </div>
    </Stack>
  );
}

export default App;
