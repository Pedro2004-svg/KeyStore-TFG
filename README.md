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

* **Backend / API:** API REST (Node.js).

* **Web:** HTML, CSS, JavaScript, EJS.

* **Móvil & Cross-Platform:** Ionic / Web Tech + **Capacitor** para integración nativa Android.

* **Plataforma Nativa:** Android Studio / Gradle.

## ⚙️ Requisitos Previos

* **Node.js**

* **npm** o **yarn**

* **Android Studio** (para abrir/compilar la carpeta `android/`)

* **Capacitor CLI**

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```
git clone https://github.com/Pedro2004-svg/KeyStore-TFG.git
cd KeyStore-TFG

```

### 2. Instalar dependencias

Desde la raíz del proyecto (donde está el `package.json`):

```
npm install
```

### 3. Configurar las variables de entorno

Copia el archivo de ejemplo y rellénalo con tus propios valores:

```
cp API_REST/configuration/.env.example API_REST/configuration/.env
```

En Windows (PowerShell):

```
copy API_REST\configuration\.env.example API_REST\configuration\.env
```

Variables necesarias:

| Variable | Para qué sirve |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL (Supabase) |
| `DB_SERVICE_RK` | Clave de servicio de Supabase |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos con Stripe |
| `RESEND_API_KEY` | Envío de correos |
| `RAWG_API_KEY` | Importación de juegos desde RAWG |

### 4. Arrancar la API REST y la web

Cada una en su propia terminal. Primero la API:

```
cd API_REST
node app.mjs
```

Y después la web:

```
cd WEB
node app.mjs
```

- API REST: `http://localhost:60000`
- Web: `http://localhost:60001`

### 5. Configurar la aplicación Móvil y Android (`MOVIL/` / `android/`)

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
