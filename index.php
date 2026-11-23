<?php
// index.php - Punto de entrada principal para RentFlow en Laragon
require_once __DIR__ . '/db.php';

if (file_exists(__DIR__ . '/dist/index.html')) {
    echo file_get_contents(__DIR__ . '/dist/index.html');
    exit;
}

// Detectar dinámicamente el archivo JS principal compilado
$assetFiles = glob(__DIR__ . '/assets/*.js');
$mainJs = '';
if ($assetFiles) {
    foreach ($assetFiles as $file) {
        $basename = basename($file);
        if (str_starts_with($basename, 'index-')) {
            $mainJs = './assets/' . $basename;
            break;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rental</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              brand: {
                50: '#eef2ff',
                500: '#6366f1',
                600: '#4f46e5',
                700: '#4338ca'
              }
            }
          }
        }
      }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', sans-serif;
        overflow: hidden;
      }
      ::-webkit-scrollbar {
        width: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    </style>
    <script type="module" crossorigin src="<?php echo htmlspecialchars($mainJs); ?>"></script>
  </head>
  <body class="bg-[#f0f4f8] text-slate-800 dark:bg-[#0a0e17] dark:text-slate-100 transition-colors duration-300">
    <div id="root"></div>
  </body>
</html>
