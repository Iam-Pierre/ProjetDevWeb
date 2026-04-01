document.getElementById("idPage").addEventListener("click", () => {
    window.location.href = "/avis";
});

document.getElementById("recommandationPage").addEventListener("click", () => {
    window.location.href = "/recommandation";
});

document.getElementById("logout").addEventListener("click", async () => {
    await fetch("/api/auth/logout", {
        method: "POST",
    });
    window.location.href = "/"
});