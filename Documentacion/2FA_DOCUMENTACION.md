# 🔐 Autenticación de Doble Factor (2FA) - GenderSense

## ¿Qué es 2FA?

La **Autenticación de Doble Factor** (Two-Factor Authentication) es una capa de seguridad adicional que requiere **dos formas de verificación** para acceder al sistema:

1. **Algo que sabes** → Tu contraseña
2. **Algo que tienes** → Tu teléfono (con Microsoft Authenticator)

Aunque alguien robe tu contraseña, **no puede entrar sin tu teléfono**.

---

## ¿Cómo funciona técnicamente en GenderSense?

### El Algoritmo TOTP (Time-based One-Time Password)

Usamos el estándar **TOTP** (RFC 6238) implementado con la librería `pyotp`. Así es como funciona el proceso completo:

### Paso 1: Activación (una sola vez)

```
┌──────────────┐                           ┌──────────────┐
│   GenderSense │      Genera clave        │   Microsoft   │
│   (Backend)   │ ──────secreta──────────► │ Authenticator │
│               │    JBSWY3DPEHPK3PXP      │  (Teléfono)   │
│               │    (vía código QR)        │               │
│  Guarda en BD │                           │  Guarda clave │
└──────────────┘                           └──────────────┘
```

1. El backend genera una **clave secreta aleatoria** de 32 caracteres (ej: `JBSWY3DPEHPK3PXP`)
2. Esta clave se guarda en la base de datos (campo `totp_secret` del usuario)
3. Se genera un **código QR** que contiene esa misma clave en formato URI estándar
4. El usuario escanea el QR con **Microsoft Authenticator** → la app guarda la clave

**Resultado:** Ambos (nuestro servidor y la app del teléfono) tienen la **misma clave secreta**.

### Paso 2: Generación de códigos (cada 30 segundos)

```
┌──────────────────────────────────────────────────────────────┐
│                    FÓRMULA TOTP                               │
│                                                               │
│  Clave Secreta + Hora Actual (cada 30s) → HMAC-SHA1 → 482917 │
│                                                               │
│  El MISMO cálculo ocurre en AMBOS lados:                     │
│  • Nuestro servidor Python (pyotp)                            │
│  • Microsoft Authenticator (en tu teléfono)                   │
│                                                               │
│  Resultado: AMBOS generan el MISMO número de 6 dígitos       │
└──────────────────────────────────────────────────────────────┘
```

La fórmula es:
1. Toma la **clave secreta** compartida
2. Toma la **hora actual** del sistema (Unix timestamp ÷ 30 = ventana de 30 segundos)
3. Aplica **HMAC-SHA1** (función criptográfica)
4. Extrae **6 dígitos** del resultado

**NO hay comunicación entre nuestro servidor y Microsoft Authenticator.** Ambos generan el código de forma independiente.

### Paso 3: Validación en el Login

```
Usuario                  Frontend                Backend
  │                          │                       │
  ├─ username+password ────►│                       │
  │                          ├── POST /login ──────►│
  │                          │                       ├─ Verifica password ✅
  │                          │                       ├─ Detecta 2FA activo
  │                          │◄── requires_2fa: true │
  │                          │    temp_token: xyz..  │
  │                          │                       │
  │  Abre Authenticator      │                       │
  │  Ve código: 482917       │                       │
  │                          │                       │
  ├─ Ingresa "482917" ─────►│                       │
  │                          ├── POST /2fa/validate ►│
  │                          │   {temp_token, code}  │
  │                          │                       ├─ pyotp.TOTP(secret)
  │                          │                       ├─ .verify("482917") ✅
  │                          │◄── access_token (JWT) │
  │                          │                       │
  │  ¡Acceso al Dashboard!   │                       │
```

---

## Archivos involucrados en la implementación

### Backend

| Archivo | Rol en 2FA |
|---------|-----------|
| `app/models/user.py` | Campos `totp_secret` (clave secreta) y `is_2fa_enabled` (bandera on/off) |
| `app/core/security.py` | Funciones: `generate_totp_secret()`, `generate_qr_code()`, `verify_totp_code()` |
| `app/api/auth.py` | Endpoints: `/2fa/setup`, `/2fa/verify`, `/2fa/validate`, `/2fa/disable` |
| `app/schemas/user.py` | Schemas: `TwoFactorSetupResponse`, `TwoFactorVerifyRequest`, `TwoFactorValidateRequest` |

### Frontend

| Archivo | Rol en 2FA |
|---------|-----------|
| `frontend/src/pages/Login.jsx` | Paso 2 del login: campo de código de 6 dígitos |
| `frontend/src/pages/UserManager.jsx` | Tarjeta para activar/desactivar 2FA + modal con QR |

### Dependencias

| Paquete | Versión | Uso |
|---------|---------|-----|
| `pyotp` | 2.9.0 | Generación y validación de códigos TOTP |
| `qrcode[pil]` | 7.4.2 | Generación de la imagen QR para el authenticator |

---

## Flujos detallados

### Activar 2FA

1. Ir a **Gestión de Usuarios** en el Dashboard
2. Click en **"Activar 2FA"**
3. El backend genera una clave secreta via `pyotp.random_base32()` y la guarda en BD
4. Se genera un QR con `qrcode` que contiene la URI: `otpauth://totp/GenderSense:email?secret=XXX&issuer=GenderSense`
5. El frontend muestra el QR en un modal
6. El usuario abre **Microsoft Authenticator** → "Agregar cuenta" → "Otro" → Escanea el QR
7. La app muestra un código de 6 dígitos que cambia cada 30 segundos
8. El usuario ingresa ese código en el modal
9. El backend valida el código con `pyotp.TOTP(secret).verify(code, valid_window=1)`
10. Si coincide → `is_2fa_enabled = True` → 2FA activo permanentemente

### Login con 2FA

1. El usuario ingresa `username` + `password` normalmente
2. El backend verifica las credenciales
3. Si el usuario tiene `is_2fa_enabled = True`:
   - **No** entrega el JWT final
   - Genera un `temp_token` (JWT de 5 min con purpose=`2fa_validation`)
   - Responde con `{ requires_2fa: true, temp_token: "..." }`
4. El frontend muestra el campo de código de verificación
5. El usuario abre Microsoft Authenticator y copia el código actual
6. El frontend envía `{ temp_token, code }` a `/api/auth/2fa/validate`
7. El backend verifica el temp_token y el código TOTP
8. Si todo es válido → entrega el JWT final → acceso al dashboard

### Desactivar 2FA

1. Ir a **Gestión de Usuarios** → Click **"Desactivar"**
2. Endpoint `/api/auth/2fa/disable` limpia `totp_secret` y pone `is_2fa_enabled = False`
3. Desde ese momento, el login vuelve a ser solo username + password

---

## Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Clave secreta | Generada con `pyotp.random_base32()` (160 bits de entropía) |
| Algoritmo | HMAC-SHA1 (estándar RFC 6238 / RFC 4226) |
| Ventana de validez | `valid_window=1` → acepta código actual ± 1 período (90s total) |
| Token temporal | JWT con expiración de 5 minutos y `purpose: "2fa_validation"` |
| Almacenamiento | `totp_secret` se guarda en PostgreSQL (considerar cifrado en producción) |

---

## Compatibilidad

El QR generado por GenderSense es compatible con cualquier app TOTP estándar:

- ✅ **Microsoft Authenticator** (Android / iOS)
- ✅ **Google Authenticator** (Android / iOS)
- ✅ **Authy** (Android / iOS / Desktop)
- ✅ **1Password**, **Bitwarden**, **KeePass**

---

## Comandos de prueba (curl)

```bash
# 1. Login normal
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -d "username=admin&password=password123" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Generar QR para 2FA
curl -s -X POST http://localhost:8000/api/auth/2fa/setup \
  -H "Authorization: Bearer $TOKEN"

# 3. Verificar código (activar 2FA)
curl -s -X POST http://localhost:8000/api/auth/2fa/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# 4. Desactivar 2FA
curl -s -X POST http://localhost:8000/api/auth/2fa/disable \
  -H "Authorization: Bearer $TOKEN"
```
