// Fecha objetivo: 1 año desde el inicio del reto
const countToDate = new Date("Feb 16, 2027 00:00:00").getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = countToDate - now;

    // Cálculos de tiempo para días, horas, minutos y segundos
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Formateo con ceros a la izquierda para mantener la estética
    const d = String(days).padStart(3, '0');
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    // Inyectar el tiempo en el div con id="countdown"
    const countdownElement = document.getElementById("countdown");
    if (countdownElement) {
        countdownElement.innerHTML = `${d}d ${h}h ${m}m ${s}s`;
    }
}

// Ejecutar la función cada 1 segundo (1000 milisegundos)
setInterval(updateCountdown, 1000);
updateCountdown(); // Llamada inicial para evitar el retraso de 1s