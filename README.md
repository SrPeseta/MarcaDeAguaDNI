# Marca DNI

Herramienta estatica para anadir una marca de agua roja a un PDF con las dos caras de un DNI. Admite **una pagina que contiene ambas caras** o **dos paginas, una cara por pagina**. La marca incluye el destinatario o finalidad indicado por el usuario.

## Ejecutar

Se necesita un navegador moderno con Canvas, File API, Blob URL y acceso a internet para cargar las bibliotecas desde el CDN. Desde este directorio:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. Seleccionar un PDF de hasta 20 MB, escribir una finalidad de hasta 64 caracteres, pulsar **Crear copia marcada**, revisar la vista previa de cada pagina y descargar el PDF. No hace falta instalar dependencias para utilizar la aplicacion. El servidor HTTP solo sirve el codigo: el PDF seleccionado no se envia a ese servidor.

## Implementacion

- `index.html` contiene el formulario, la vista previa, el proceso explicado y el control para descargar el codigo. `styles.css` define el diseno adaptable. `app.js` gestiona las validaciones, la conversion y los enlaces temporales de descarga.
- PDF.js abre los bytes locales y dibuja cada pagina visible, con su rotacion, en un Canvas a escala maxima 2, lado maximo 3600 px y 12 millones de pixeles por pagina. No analiza ni detecta el DNI dentro de la pagina.
- Canvas dibuja seis marcas rojas semitransparentes (dos columnas, tres filas), incluida la finalidad, sobre cada pagina. Se genera un JPEG al 90 % y pdf-lib lo inserta en una pagina nueva con las proporciones de la pagina visible. De este modo la marca queda integrada en los pixeles, no como texto extraible en una capa PDF separada.
- La vista previa reutiliza esas imagenes. Solo si todas las paginas se procesan se crea el PDF descargable. Los enlaces Blob se revocan al cambiar la entrada o salir de la pagina.
- El boton de auditoria obtiene mediante GET los cuatro archivos del proyecto (`index.html`, `styles.css`, `app.js` y `README.md`) del mismo origen y JSZip genera un ZIP. No incluye documentos subidos, resultados ni dependencias externas.

## Dependencias externas

Inyectadas mediante etiquetas `<script src>` con versiones fijas y hashes SHA-384 (SRI) en `index.html`:

| Biblioteca | URL | Licencia |
| --- | --- | --- |
| PDF.js 3.11.174 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js | Apache-2.0 |
| PDF.js worker 3.11.174 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js | Apache-2.0 |
| pdf-lib 1.17.1 | https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js | MIT |
| JSZip 3.10.2 | https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js | MIT o GPL-3.0 |

El navegador solicita estos scripts al CDN cuando se abre la pagina; el worker se solicita al procesar un PDF. El hash SRI cubre las tres etiquetas `script`, pero no la descarga del worker. El CDN puede ver la peticion de las bibliotecas, pero la aplicacion no envia el archivo seleccionado ni el texto de la finalidad a servicios externos. El codigo de terceros tiene acceso al navegador: **para una auditoria completa, examina tambien esas versiones y su procedencia antes de utilizar documentos reales**. El ZIP no es un paquete sin conexion. No se usan cuentas, almacenamiento persistente ni llamadas a una API de procesamiento.

## Limitaciones de seguridad y calidad

La marca disuade usos no autorizados, pero **no garantiza la proteccion**: se puede recortar o modificar el contenido de una imagen con un editor. Revisa que las dos caras esten cubiertas en la vista previa. La conversion rasteriza el PDF: se pierden el texto seleccionable, enlaces, formularios, firmas digitales y metadatos originales; puede aumentar el tamano y reducir la nitidez. No se aceptan PDF cifrados ni mas de dos paginas. Un PDF complejo o con fuentes especiales puede renderizarse de forma distinta en ciertos navegadores. Comparte solo los datos imprescindibles.
