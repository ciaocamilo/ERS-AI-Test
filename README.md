# ERS: Elefantes rosados en la ciudad

Código fuente de la versión publicada el 3 de octubre de 2026 (hora de Colombia).
Sitio: https://elefante-en-el-aire.ciaocamilo.chatgpt.site
Commit de referencia: d1a8d476fd73fcc69e4f44fe7d9ef68599563ac9

## Ejecutar localmente

1. Descomprime este ZIP.
2. Abre una terminal dentro de la carpeta `ERS_Codigo_Fuente`.
3. Con Python 3 instalado, ejecuta:

```bash
python -m http.server 8000 --directory dist
```

En Linux/macOS puedes usar `python3` en lugar de `python`.
4. Abre http://localhost:8000 en un navegador con WebGL.

No requiere npm, compilación, claves API ni servicios externos. Three.js y la música están incluidos.
Abre el juego mediante el servidor HTTP; abrir `index.html` con doble clic puede bloquear los módulos JavaScript.

## Controles y objetivo

- Flechas: desplazarse; Espacio: subir; C: bajar.
- En móvil aparecen botones táctiles de dirección y altura.
- Recolecta las siete estrellas. Al reiniciar cambian de ubicación.
- El panel muestra dirección, distancia y altura de la estrella más cercana.
- Los controles superiores permiten activar música, ajustar volumen, pausar y reiniciar.
- El sonido de premio se habilita después de interactuar con el juego.

## Estructura

- `dist/index.html`: interfaz del juego.
- `dist/style.css`: estilos y adaptación a móvil.
- `dist/game.js`: escena, ciudad, movimiento y coordinación del juego.
- `dist/controls.js`: teclado y controles táctiles.
- `dist/city-life.js`: colisiones, peatones y agrupación de objetos 3D.
- `dist/scenery.js`: materiales, lago, reflejos y perturbaciones del agua.
- `dist/star-quest.js`: estrellas, premios, victoria y nubes animadas.
- `dist/elephant-*.js`: cuerpo, ojos, parpadeo y sonrisa.
- `dist/music.js` y `dist/ers-theme.mp3`: reproducción de la música.
- `dist/three.module.js`: dependencia Three.js, revisión 160, bajo licencia MIT.
- `music-source/compose.py`: sintetizador de la música original.

## Regenerar la música (opcional)

El MP3 listo para usar ya está incluido. Solo para regenerarlo necesitas NumPy, SciPy y FFmpeg:

```bash
python -m pip install numpy scipy
python music-source/compose.py
ffmpeg -i music-source/ers-theme.wav -codec:a libmp3lame -q:a 3 dist/ers-theme.mp3
```

La copia del generador incluida usa una ruta relativa al propio script para que funcione fuera del entorno original.

## Publicar en otro alojamiento

Publica el contenido de `dist/` como sitio estático. Conserva los nombres y la estructura de los archivos.
El ZIP no incluye credenciales, historial Git ni configuración de la cuenta de alojamiento.
