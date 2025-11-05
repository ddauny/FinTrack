#!/bin/sh

# Stampa un messaggio per il debug
echo "Generating Nginx configuration..."
echo "Backend service name is: ${BACKEND_SERVICE_NAME}"

# Esegui la sostituzione della variabile nel template e crea il file di configurazione finale.
# Specifichiamo a envsubst di sostituire solo ${BACKEND_SERVICE_NAME}.
envsubst '${BACKEND_SERVICE_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Stampa il contenuto del file generato per un ulteriore controllo (opzionale ma utile)
echo "Generated Nginx config:"
cat /etc/nginx/conf.d/default.conf
echo "--------------------------"

# Avvia il processo principale di Nginx in primo piano.
# 'exec' sostituisce il processo dello script con Nginx,
# che è una buona pratica per i segnali di stop/kill.
exec nginx -g 'daemon off;'
