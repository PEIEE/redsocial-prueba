let currentReelIndex = 0;

function navigateReel(direction) {
    const reelItems = document.querySelectorAll('.reel-item');
    if (reelItems.length === 0) return;
    currentReelIndex = (currentReelIndex + direction + reelItems.length) % reelItems.length;
    updateReelDisplay();
}

function updateReelDisplay() {
    const reelItems = document.querySelectorAll('.reel-item');
    reelItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentReelIndex);
        const video = item.querySelector('video');
        if (video) {
            if (item.classList.contains('active')) {
                video.play().catch(error => console.error('Error al reproducir video:', error));
            } else {
                video.pause();
            }
        }
    });
}

function toggleLike(button) {
    const likeCount = button.querySelector('.like-count');
    if (!likeCount) return;
    let count = parseInt(likeCount.textContent) || 0;
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

// Iniciar con el primer reel visible
document.addEventListener('DOMContentLoaded', () => {
    updateReelDisplay();
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => alert('Notificaciones: 0 nuevas'));
    }
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => alert('Perfil de ' + document.getElementById('user-name').textContent));
    }
});
