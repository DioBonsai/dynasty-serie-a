'use strict';
/* Configurazione ESLint (flat config) per gli script condivisi in assets/,
   scripts/ e tests/. I file HTML con <script> inline non sono coperti qui
   (nessun plugin HTML installato): la loro sintassi e' comunque verificata
   da `npm test` -> node --check indiretto nei test di integrazione. */
module.exports = [
    {
        files: ['assets/*.js', 'scripts/*.js', 'tests/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                module: 'writable',
                require: 'readonly',
                global: 'writable',
                performance: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                AudioContext: 'readonly',
                webkitAudioContext: 'readonly',
                navigator: 'readonly',
                confirm: 'readonly',
                QZ: 'writable',
                QZSound: 'writable',
                QuizEngine: 'writable',
                QUIZ_DB: 'writable',
                __dirname: 'readonly',
                process: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
            eqeqeq: ['warn', 'smart'],
            'no-var': 'off'
        }
    }
];
