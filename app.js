const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_CANVAS_PIXELS = 12_000_000;
const WORKER_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const form = document.querySelector("#watermark-form");
const fileInput = document.querySelector("#pdf-file");
const purposeInput = document.querySelector("#purpose");
const processButton = document.querySelector("#process-button");
const downloadLink = document.querySelector("#download-pdf");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const sourceButton = document.querySelector("#download-source");
const auditStatus = document.querySelector("#audit-status");
const SOURCE_FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "README.md",
];
let outputUrl;
let previewUrls = [];

function clearOutput() {
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  outputUrl = undefined;
  previewUrls = [];
  preview.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "empty-preview";
  empty.textContent =
    "Las páginas marcadas aparecerán aquí para que compruebes la cobertura.";
  preview.append(empty);
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function downloadName(filename) {
  return `${filename.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "_")}-con-marca.pdf`;
}

function paintWatermark(context, width, height, purpose) {
  const columns = 2;
  const rows = 3;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const fontSize = Math.max(14, Math.min(42, cellWidth / 11, cellHeight / 2));
  context.save();
  context.fillStyle = "rgba(190, 18, 32, 0.57)";
  context.font = `700 ${fontSize}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      context.save();
      context.translate((column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
      context.rotate(-Math.PI / 9);
      context.fillText(
        `SOLO PARA ${purpose.toLocaleUpperCase("es")}`,
        0,
        0,
        cellWidth * 1.18,
      );
      context.restore();
    }
  }
  context.restore();
}

function canvasJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen.")),
      "image/jpeg",
      0.9,
    );
  });
}

async function watermarkPdf(file, purpose) {
  if (
    !file ||
    !/\.pdf$/i.test(file.name) ||
    (file.type && file.type !== "application/pdf")
  ) {
    throw new Error("Selecciona un archivo PDF.");
  }
  if (file.size > MAX_FILE_BYTES)
    throw new Error("El PDF no puede superar 20 MB.");
  if (!purpose.trim() || purpose.trim().length > 64) {
    throw new Error("Indica un destinatario o finalidad de 1 a 64 caracteres.");
  }
  if (!window.pdfjsLib || !window.PDFLib)
    throw new Error(
      "No se han cargado las bibliotecas PDF. Comprueba tu conexión.",
    );

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    new TextDecoder("ascii").decode(bytes.subarray(0, 1024)).indexOf("%PDF-") <
    0
  ) {
    throw new Error("El archivo no contiene un PDF válido.");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  const task = pdfjsLib.getDocument({ data: bytes, stopAtErrors: true });
  let documentPdf;
  const pendingPreviews = [];
  try {
    documentPdf = await task.promise;
    if (documentPdf.numPages < 1 || documentPdf.numPages > 2) {
      throw new Error("El PDF debe tener una o dos páginas.");
    }
    const result = await PDFLib.PDFDocument.create();
    for (let index = 1; index <= documentPdf.numPages; index += 1) {
      showStatus(`Procesando página ${index} de ${documentPdf.numPages}...`);
      const page = await documentPdf.getPage(index);
      const original = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        3600 / Math.max(original.width, original.height),
        Math.sqrt(MAX_CANVAS_PIXELS / (original.width * original.height)),
      );
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      if (!canvas.width || !canvas.height)
        throw new Error("La página tiene dimensiones inválidas.");
      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context,
        viewport,
        background: "#ffffff",
      }).promise;
      paintWatermark(context, canvas.width, canvas.height, purpose.trim());
      const imageBlob = await canvasJpeg(canvas);
      const url = URL.createObjectURL(imageBlob);
      pendingPreviews.push(url);
      const image = await result.embedJpg(await imageBlob.arrayBuffer());
      result.addPage([original.width, original.height]).drawImage(image, {
        x: 0,
        y: 0,
        width: original.width,
        height: original.height,
      });
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
    return { bytes: await result.save(), previews: pendingPreviews };
  } catch (error) {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    if (error.name === "PasswordException")
      throw new Error("No se admiten PDF protegidos con contraseña.");
    if (
      error.name === "InvalidPDFException" ||
      error.name === "MissingPDFException"
    ) {
      throw new Error("El PDF está dañado o no se puede abrir.");
    }
    throw error;
  } finally {
    await task.destroy();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearOutput();
  processButton.disabled = true;
  fileInput.disabled = true;
  purposeInput.disabled = true;
  showStatus("Leyendo PDF...");
  try {
    const result = await watermarkPdf(fileInput.files[0], purposeInput.value);
    previewUrls = result.previews;
    preview.replaceChildren(
      ...previewUrls.map((url, index) => {
        const figure = document.createElement("figure");
        const image = document.createElement("img");
        const caption = document.createElement("figcaption");
        image.src = url;
        image.alt = `Página ${index + 1} con marca de agua`;
        caption.textContent = `Página ${index + 1}`;
        figure.append(image, caption);
        return figure;
      }),
    );
    outputUrl = URL.createObjectURL(
      new Blob([result.bytes], { type: "application/pdf" }),
    );
    downloadLink.href = outputUrl;
    downloadLink.download = downloadName(fileInput.files[0].name);
    downloadLink.hidden = false;
    showStatus(
      "PDF listo. Comprueba que la marca cubre ambas caras antes de descargar.",
    );
  } catch (error) {
    showStatus(error.message || "No se pudo procesar el PDF.", true);
  } finally {
    processButton.disabled = false;
    fileInput.disabled = false;
    purposeInput.disabled = false;
  }
});

fileInput.addEventListener("change", clearOutput);
purposeInput.addEventListener("input", clearOutput);
window.addEventListener("pagehide", clearOutput);

sourceButton.addEventListener("click", async () => {
  sourceButton.disabled = true;
  auditStatus.dataset.error = "false";
  auditStatus.textContent = "Preparando código...";
  try {
    if (!window.JSZip)
      throw new Error(
        "No se ha cargado la biblioteca ZIP. Comprueba tu conexión.",
      );
    const zip = new JSZip();
    for (const path of SOURCE_FILES) {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok)
        throw new Error(`No se pudo incluir ${path} en el ZIP.`);
      zip.file(path, await response.blob());
    }
    const archive = await zip.generateAsync({ type: "blob" });
    const archiveUrl = URL.createObjectURL(archive);
    const link = document.createElement("a");
    link.href = archiveUrl;
    link.download = "marca-dni-codigo.zip";
    link.click();
    setTimeout(() => URL.revokeObjectURL(archiveUrl), 60_000);
    auditStatus.textContent = "Código descargado.";
  } catch (error) {
    auditStatus.dataset.error = "true";
    auditStatus.textContent = error.message || "No se pudo preparar el código.";
  } finally {
    sourceButton.disabled = false;
  }
});
