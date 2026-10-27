# KeyStore - Trabajo de Fin de Grado (TFG)

Bienvenido al repositorio de **KeyStore**, un proyecto desarrollado como Trabajo de Fin de Grado (TFG) por [Pedro](https://github.com/Pedro2004-svg) y su compañero de equipo.

Este proyecto consiste en una plataforma integral para la gestión y tienda de claves/licencias, compuesta por una API REST, cliente web y aplicación móvil (Android).

## 👥 Reparto de Trabajo y Autores

A continuación se detalla la contribución y responsabilidad de cada integrante en los distintos módulos del proyecto:

### 👤 **Pedro (@Pedro2004-svg)**

* 📱 **Aplicación Móvil (`MOVIL/`):** Desarrollo íntegro del cliente móvil.

* 🤖 **Generación e Integración Android (`android/`):** Configuración e integración del entorno nativo Android generado a través de **Capacitor**.

* 🛒 **Módulo de Carrito de Compras (`WEB/`):** Implementación completa de la lógica y frontend del carrito dentro de la plataforma Web.

* ⚙️ **Controladores API (`API_REST/`):** Desarrollo del **50% de los controladores (controllers)** encargados de la lógica de negocio y comunicación con los endpoints.

### 👤 **Luis Eduardo (@neko-edd)**

* 🌐 **Plataforma Web (`WEB/`):** Desarrollo de la arquitectura base e interfaz web (exceptuando el módulo del carrito).

* ⚙️ **API REST (`API_REST/`):** Estructura principal del servidor, modelos, configuración de base de datos y la otra mitad de los controladores (controllers).

## 📋 Tabla de Contenidos

* [Estructura del Proyecto](#-estructura-del-proyecto)

* [Características Principales](#-características-principales)

* [Tecnologías Utilizadas](#-tecnologías-utilizadas)

* [Requisitos Previos](#-requisitos-previos)

* [Instalación y Configuración](#-instalación-y-configuración)

* [Despliegue y Uso](#-despliegue-y-uso)

* [Contacto y Autoría](#-contacto-y-autoría)

## 📁 Estructura del Proyecto

```
KeyStore-TFG/
├── API_REST/       # Servidor Backend (API REST, Controladores, Modelos, DB)
├── WEB/            # Cliente Web para usuarios y administración
├── MOVIL/          # Proyecto de la Aplicación Móvil (Capacitor / Frontend)
├── android/        # Proyecto nativo generado por Capacitor para Android
├── .gitignore
└── README.md

```

## ✨ Características Principales

* 🛒 **Gestión de Carrito y Compras:** Carrito dinámico desarrollado para la plataforma web.

* 📱 **Experiencia Móvil Nativa:** App móvil integrada con Android mediante **Capacitor**.

* ⚡ **API REST Centralizada:** Controladores dedicados para la gestión de usuarios, productos, autenticación y transacciones.

* 💻 **Plataforma Web:** Interfaz completa para la exploración y gestión de productos.

## 🛠️ Tecnologías Utilizadas

* **Backend / API:** API REST (Node.js/Express, Spring Boot o framework utilizado).

* **Web:** HTML, CSS, JavaScript / Framework Web.

* **Móvil & Cross-Platform:** Ionic / Web Tech + **Capacitor** para integración nativa Android.

* **Plataforma Nativa:** Android Studio / Gradle.

## ⚙️ Requisitos Previos

* **Node.js** (versión recomendada LTS)

* **npm** o **yarn**

* **Android Studio** (para abrir/compilar la carpeta `android/`)

* **Capacitor CLI** (instalado de forma global o local)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```
git clone https://github.com/Pedro2004-svg/KeyStore-TFG.git
cd KeyStore-TFG

```

### 2. Configurar la API REST (`API_REST/`)

```
cd API_REST
npm install
npm run start # o comando correspondiente

```

### 3. Configurar la aplicación Web (`WEB/`)

```
cd ../WEB
npm install
npm start

```

### 4. Configurar la aplicación Móvil y Android (`MOVIL/` / `android/`)

```
cd ../MOVIL
npm install
npx cap sync android  # Sincroniza los cambios con la carpeta nativa android

```

Para ejecutar en Android, abre la carpeta `android/` con **Android Studio** o ejecuta:

```
npx cap open android

```

## 📜 Licencia y Universidad

Proyecto desarrollado dentro del marco del **Trabajo de Fin de Grado (TFG)**. 
