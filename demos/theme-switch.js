/* Based of https://dev.to/ananyaneogi/create-a-dark-light-mode-switch-with-css-variables-34l8 */

const toggleButton = document.querySelector('button');
const currentTheme = localStorage.getItem('theme');
let isDark = false;

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        document.getElementById("theme-icon").innerHTML= "wb_sunny";
        isDark = true;
    }
    else {
        document.getElementById("theme-icon").innerHTML= "brightness_2";
    }
}

function switchTheme(e) {
    if (isDark == false) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById("theme-icon").innerHTML= "wb_sunny";
        localStorage.setItem('theme', 'dark');
        isDark = true;
    }
    else {        
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById("theme-icon").innerHTML= "brightness_2";
        localStorage.setItem('theme', 'light');
        isDark = false;
    }    
}

toggleButton.addEventListener('click', switchTheme);
