document.getElementById("btnRegister").addEventListener("click", () => {
    document.getElementById("loginfields").style.display = "none";
    document.getElementById("registerfields").style.display = "block";
});

document.getElementById("btnLogin").addEventListener("click", () => {
    document.getElementById("registerfields").style.display = "none";
    document.getElementById("loginfields").style.display = "block";
    
});

const formRegister = document.getElementById("formulaireRegister");
formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("usernameRegister").value;
    const password = document.getElementById("passwordRegister").value;

    const response = await fetch("api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.ok) {
        window.location.href= "/";
    }
})

const formLogin = document.getElementById("formulaireLogin");
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;


    const response = await fetch("api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json",},
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.ok) {
        window.location.href= "/";
    }

})