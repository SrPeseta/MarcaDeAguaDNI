# Marca DNI

Herramienta estática para añadir una marca de agua roja a un PDF con las dos caras de un DNI. Admite **una página que contiene ambas caras** o **dos páginas, una cara por página**. La marca incluye el destinatario o finalidad indicado por el usuario.

## Ejecutar

Se necesita un navegador moderno con Canvas, File API, Blob URL y acceso a internet para cargar las bibliotecas desde el CDN. Desde este directorio:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. Seleccionar un PDF de hasta 20 MB, escribir una finalidad de hasta 64 caracteres, pulsar **Crear copia marcada**, revisar la vista previa de cada página y descargar el PDF. No hace falta instalar dependencias para utilizar la aplicación. El servidor HTTP solo sirve el código: el PDF seleccionado no se envía a ese servidor.

## Implementación

- `index.html` contiene el formulario, la vista previa, el proceso explicado y el control para descargar el código. `styles.css` define el diseño adaptable. `app.js` gestiona las validaciones, la conversión y los enlaces temporales de descarga.
- PDF.js abre los bytes locales y dibuja cada página visible, con su rotación, en un Canvas a escala máxima 2, lado máximo 3600 px y 12 millones de píxeles por página. No analiza ni detecta el DNI dentro de la página.
- Canvas dibuja seis marcas rojas semitransparentes (dos columnas, tres filas), incluida la finalidad, sobre cada página. Se genera un JPEG al 90 % y pdf-lib lo inserta en una página nueva con las proporciones de la página visible. De este modo la marca queda integrada en los píxeles, no como texto extraíble en una capa PDF separada.
- La vista previa reutiliza esas imágenes. Solo si todas las páginas se procesan se crea el PDF descargable. Los enlaces Blob se revocan al cambiar la entrada o salir de la página.
- El botón de auditoría obtiene mediante GET los cuatro archivos del proyecto (`index.html`, `styles.css`, `app.js` y `README.md`) del mismo origen y JSZip genera un ZIP. No incluye documentos subidos, resultados ni dependencias externas.

## Dependencias externas

Inyectadas mediante etiquetas `<script src>` con versiones fijas y hashes SHA-384 (SRI) en `index.html`:

| Biblioteca | URL | Licencia |
| --- | --- | --- |
| PDF.js 3.11.174 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js | Apache-2.0 |
| PDF.js worker 3.11.174 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js | Apache-2.0 |
| pdf-lib 1.17.1 | https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js | MIT |
| JSZip 3.10.2 | https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js | MIT o GPL-3.0 |

El navegador solicita estos scripts al CDN cuando se abre la página; el worker se solicita al procesar un PDF. El hash SRI cubre las tres etiquetas `script`, pero no la descarga del worker. El CDN puede ver la petición de las bibliotecas, pero la aplicación no envía el archivo seleccionado ni el texto de la finalidad a servicios externos. El código de terceros tiene acceso al navegador: **para una auditoría completa, examina también esas versiones y su procedencia antes de utilizar documentos reales**. El ZIP no es un paquete sin conexión. No se usan cuentas, almacenamiento persistente ni llamadas a una API de procesamiento.

## Limitaciones de seguridad y calidad

La marca disuade usos no autorizados, pero **no garantiza la protección**: se puede recortar o modificar el contenido de una imagen con un editor. Revisa que las dos caras estén cubiertas en la vista previa. La conversión rasteriza el PDF: se pierden el texto seleccionable, enlaces, formularios, firmas digitales y metadatos originales; puede aumentar el tamaño y reducir la nitidez. No se aceptan PDF cifrados ni más de dos páginas. Un PDF complejo o con fuentes especiales puede renderizarse de forma distinta en ciertos navegadores. Comparte solo los datos imprescindibles.
