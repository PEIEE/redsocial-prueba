let currentReelIndex = 0;

function navigateReel(direction) {
    const reelItems = document.querySelectorAll('.reel-item');
    currentReelIndex = (currentReelIndex + direction + reelItems.length) % reelItems.length;
    updateReelDisplay();
}

function updateReelDisplay() {
    const reelItems = document.querySelectorAll('.reel-item');
    reelItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentReelIndex);
        if (item.classList.contains('active')) {
            item.querySelector('video').play();
        } else {
            item.querySelector('video').pause();
        }
    });
}

function toggleLike(button) {
    const likeCount = button.querySelector('.like-count');
    let count = parseInt(likeCount.textContent);
    count = button.classList.contains('liked') ? count - 1 : count + 1;
    likeCount.textContent = count;
    button.classList.toggle('liked');
    button.style.background = button.classList.contains('liked') ? '#ff4444' : 'rgba(255, 255, 255, 0.2)';
}

function toggleFollow(button) {
    const isFollowing = button.textContent === 'Siguiendo';
    button.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
    button.style.background = isFollowing ? 'rgba(255, 255, 255, 0.2)' : '#7289da';
}

function shareReel(button) {
    const reelUrl = window.location.href;
    navigator.clipboard.writeText(reelUrl).then(() => {
        alert('Enlace copiado: ' + reelUrl);
    }).catch(err => {
        console.error('Error al copiar el enlace:', err);
        alert('Error al copiar el enlace.');
    });
}

function selectChat(chat) {
    console.log('Chat seleccionado:', chat.querySelector('h3').textContent);
    // Aquí puedes añadir lógica para mostrar el chat seleccionado (ej. un modal o cambiar contenido)
}

document.addEventListener('DOMContentLoaded', () => {
    updateReelDisplay();
    document.getElementById('notifications-btn').addEventListener('click', () => alert('Notificaciones: 0 nuevas'));
    document.getElementById('profile-btn').addEventListener('click', () => alert('Perfil de ' + document.getElementById('user-name').textContent));
});
