-- Active les comptes réels pour une connexion sans e-mail.
-- Agents : identifiant = email, mot de passe Agent@2026 (à changer à la première connexion)
-- Prestataires : identifiant = email contact@..., mot de passe Prest@2026

UPDATE users
SET password_hash = '$2a$10$EQFxmOYJF6rLJYEWGR6PwefgrHtNhM5s.VcXGhtY.Y1Er5BVNwgs.',
    must_change_password = true,
    setup_token = NULL,
    setup_token_expires = NULL,
    reset_token = NULL,
    reset_token_expires = NULL
WHERE role = 'agent';

UPDATE users
SET password_hash = '$2a$10$iC3QLiu1wjTMc/jPhz3hPehjYz5WUdXsnyx6etMR/VPxLBnJAS0US',
    must_change_password = false,
    setup_token = NULL,
    setup_token_expires = NULL,
    reset_token = NULL,
    reset_token_expires = NULL
WHERE role = 'provider';
