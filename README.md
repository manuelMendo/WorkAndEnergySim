# ⚛️ Laboratorio Virtual de Física 2D

Un simulador dinámico vectorial en 2D diseñado a nivel universitario para visualizar y calcular fenómenos de mecánica clásica en tiempo real. Construido puramente con tecnologías web estándar y renderizado matemático interactivo.

## 🚀 Características Principales

El laboratorio cuenta con dos módulos experimentales:

* **Módulo 1: Trabajo y Fricción**
    * Simulación de fuerza aplicada sobre múltiples masas (cajas apilables dinámicas).
    * Ajuste en tiempo real del coeficiente de fricción dinámica.
    * Cálculo automático de la fuerza neta y aceleración del sistema mediante la Segunda Ley de Newton.
    * Renderizado de paralaje continuo para simular el desplazamiento.

* **Módulo 2: Conservación de Energía (Crash Lab)**
    * Simulador de colisiones frontales entre dos vehículos.
    * Control total sobre las masas y velocidades iniciales de los cuerpos.
    * Ajuste del coeficiente de restitución (e) para simular choques elásticos e inelásticos.
    * Cálculo en vivo de la energía cinética inicial/final y el momento lineal total del sistema.
    * Sistema de partículas personalizadas, "screen shake" y fricción post-impacto.

## 🛠️ Tecnologías Utilizadas

* **HTML5 & CSS3:** Interfaz de usuario responsiva estilo "Dashboard".
* **JavaScript (ES6):** Motor de física custom (`PhysicsEngine`) orientado a objetos y renderizado puramente en Canvas API.
* **MathJax:** Integración para el renderizado analítico de fórmulas en tiempo real.

## ⚙️ Instalación y Uso

Este proyecto no requiere dependencias de Node.js, empaquetadores ni procesos de compilación.

1. Clona este repositorio: 
   ```bash
   git clone [https://github.com/TU_USUARIO/laboratorio-mecanica-2d.git](https://github.com/TU_USUARIO/laboratorio-mecanica-2d.git)
