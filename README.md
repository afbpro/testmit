# colega-linker

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Action: build + update repo in cPanel

Se agrego el workflow [cpanel-update.yml](.github/workflows/cpanel-update.yml), que se ejecuta automaticamente al hacer push a main:

1. Instala dependencias.
2. Ejecuta `npm run build`.
3. Llama a la API de cPanel para actualizar el repositorio remoto.
4. Opcionalmente, ejecuta un endpoint adicional de deploy.

### Secrets requeridos en GitHub

Configuralos en Settings > Secrets and variables > Actions:

- `CPANEL_AUTH_USER`: usuario cPanel.
- `CPANEL_API_TOKEN`: token de API de cPanel.
- `CPANEL_UPDATE_API_URL`: URL completa del endpoint API para actualizar el repo.
- `CPANEL_DEPLOY_API_URL` (opcional): URL completa del endpoint API para desplegar.

Ejemplo de `CPANEL_UPDATE_API_URL` (ajusta usuario y ruta segun tu servidor):

```text
https://tu-host-cpanel:2083/execute/VersionControlDeployment/update?repository_root=%2Fhome%2Fusuario%2Frepositories%2Fcolega-linker
```

Ejemplo de `CPANEL_DEPLOY_API_URL` opcional:

```text
https://tu-host-cpanel:2083/execute/VersionControlDeployment/deploy?repository_root=%2Fhome%2Fusuario%2Frepositories%2Fcolega-linker
```

Si tu servidor usa otro modulo o funcion de API, solo cambia las URLs de los secrets sin tocar el workflow.
