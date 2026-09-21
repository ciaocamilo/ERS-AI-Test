# ERS: Elefantes rosados en la escena del crimen

Pequeño videojuego 3D de vuelo libre en el navegador, desarrollado con JavaScript y Three.js. Controla un elefante rosado por una ciudad con edificios, calles, pasos peatonales, semáforos y vehículos animados.

Incluye una banda sonora instrumental original con saxofón sintetizado, cuerdas y percusión. La música se activa de forma voluntaria, tiene control de volumen y se detiene al pausar.

## Ejecutar en tu equipo

Necesitas un navegador con WebGL y Python 3 para servir los archivos. Desde la raíz del proyecto:

```sh
python -m http.server 8000 --directory dist
```

En Windows también puedes usar `py -m http.server 8000 --directory dist`.

Abre http://localhost:8000. No abras `index.html` directamente con doble clic: el juego utiliza módulos JavaScript y necesita un servidor HTTP. No requiere npm, compilación ni servicios externos para jugar. Detén el servidor con Ctrl+C.

## Controles

| Acción | Control |
| --- | --- |
| Desplazarse | Flechas del teclado |
| Subir | Espacio |
| Bajar | C |
| Pausar o continuar | Esc o botón Pausa |
| Regresar al inicio | Reiniciar |
| Activar o silenciar música | Botón de música |

En dispositivos táctiles aparecen botones de movimiento y altura.

## Archivos

- `dist/index.html`: interfaz del juego.
- `dist/style.css`: estilos y adaptación a pantallas pequeñas.
- `dist/game.js`: escena, elefante, ciudad, animaciones, cámara y controles.
- `dist/music.js`: reproducción y controles de la música.
- `dist/ers-theme.mp3`: composición instrumental en bucle.
- `dist/three.module.js`: Three.js 0.160.1, incluida localmente.
- `dist/THREE-LICENSE.txt`: licencia de Three.js.
- `music-source/compose.py`: generación de la banda sonora.
- `music-source/requirements.txt`: dependencias para regenerar el audio.

## Regenerar la música (opcional)

La música incluida está lista para reproducirse. Para modificarla necesitas Python 3, NumPy, SciPy y FFmpeg:

```sh
python -m pip install -r music-source/requirements.txt
python music-source/compose.py
ffmpeg -y -i music-source/ers-theme.wav -codec:a libmp3lame -b:a 160k dist/ers-theme.mp3
```

El script guarda el WAV junto a `compose.py`. El saxofón es sintetizado, no una grabación acústica. El WAV intermedio no se incluye en Git.

## Publicación y alcance

La carpeta `dist/` puede alojarse en cualquier servidor de archivos estáticos. Este repositorio no incluye credenciales, configuración interna del alojamiento ni historial del sitio privado. Publicar el código en GitHub no publica automáticamente una web en GitHub Pages.

Es un prototipo de exploración libre; no tiene misiones, puntuación ni guardado de partidas.

## Dependencias y licencia

Three.js se distribuye bajo licencia MIT; su aviso completo se incluye en `dist/THREE-LICENSE.txt`. No se ha seleccionado todavía una licencia de distribución para el código y la música propios del proyecto.
