<?php
declare(strict_types=1);

function applyCorsHeaders(string $origin): void
{
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function resolveAction(): string
{
    $fromQuery = trim((string) ($_GET['action'] ?? ''));
    if ($fromQuery !== '') {
        return strtolower($fromQuery);
    }

    $pathInfo = trim((string) ($_SERVER['PATH_INFO'] ?? ''), '/');
    if ($pathInfo !== '') {
        return str_replace('/', '-', strtolower($pathInfo));
    }

    $requestUri = trim((string) ($_SERVER['REQUEST_URI'] ?? ''));
    if ($requestUri === '') {
        return '';
    }

    $path = (string) parse_url($requestUri, PHP_URL_PATH);
    $path = trim($path, '/');

    if (preg_match('#^api/(.+)$#i', $path, $matches) === 1) {
        return str_replace('/', '-', strtolower($matches[1]));
    }

    return '';
}

function jsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    $data = json_decode((string) $rawBody, true);

    if (!is_array($data)) {
        jsonResponse(400, [
            'ok' => false,
            'message' => 'JSON invalido.'
        ]);
    }

    return $data;
}

function isAllowedOrigin(string $origin): bool
{
    if ($origin === '') {
        return false;
    }

    $parts = parse_url($origin);
    if (!is_array($parts)) {
        return false;
    }

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));

    if ($scheme === '' || $host === '') {
        return false;
    }

    if ($scheme === 'https' && $host === 'app.cupertino.uy') {
        return true;
    }

    if (($scheme === 'http' || $scheme === 'https') && ($host === 'localhost' || $host === '127.0.0.1')) {
        return true;
    }

    if (($scheme === 'http' || $scheme === 'https') && preg_match('/^192\.168\.1\.(\d{1,3})$/', $host, $matches) === 1) {
        $lastOctet = (int) $matches[1];
        return $lastOctet >= 0 && $lastOctet <= 255;
    }

    return false;
}
