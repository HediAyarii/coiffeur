// Date locale (heure française) au format YYYY-MM-DD, sans passer par UTC.
// toISOString() donnerait la veille entre minuit et 1h (2h en été).
export const toLocalDateStr = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Les services sont stockés en UTC et filtrés par DATE() côté serveur.
// Entre minuit et 1h (2h en été), l'heure UTC tombe la veille de la date choisie :
// dans ce cas on enregistre à midi pour que le service reste bien sur la date choisie.
export const buildServiceDateTime = (dateStr) => {
    const withCurrentTime = new Date(`${dateStr}T${new Date().toTimeString().slice(0, 8)}`);
    if (withCurrentTime.toISOString().slice(0, 10) === dateStr) {
        return withCurrentTime.toISOString();
    }
    return new Date(`${dateStr}T12:00:00`).toISOString();
};
