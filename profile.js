<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Perfil - Chat Klax</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="profile-container">
        <h2>Editar Perfil</h2>
        <div class="profile-avatar">
            <img id="user-avatar" src="default-avatar.png" alt="Avatar" class="user-avatar">
        </div>
        <label>Nombre de Usuario:</label>
        <input type="text" id="display-name" placeholder="Nombre de usuario">
        <label>Subir Nuevo Avatar:</label>
        <input type="file" id="avatar-upload" accept="image/*">
        <button id="save-profile">Guardar Cambios</button>
        <button id="back-btn">Volver</button>
    </div>

    <script src="profile.js"></script>
</body>
</html>
