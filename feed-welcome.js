document.addEventListener('DOMContentLoaded', () => {
    // Obtener el nombre del usuario desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const userName = urlParams.get('user');
    if (userName) {
        document.getElementById('user-name').textContent = decodeURIComponent(userName);
    } else {
        document.getElementById('user-name').textContent = 'Invitado'; // Fallback
        console.warn('No se encontró nombre de usuario en la URL.');
    }
});
