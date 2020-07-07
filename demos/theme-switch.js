/* Based of of https://dev.to/ananyaneogi/create-a-dark-light-mode-switch-with-css-variables-34l8 */

const toggleSwitch = document.querySelector('.mdl-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  
    if (currentTheme === 'dark') {
        document.getElementById("theme-icon").innerHTML= "brightness_2";
        toggleSwitch.checked = true;
    }
    else {
        document.getElementById("theme-icon").innerHTML= "wb_sunny";
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById("theme-icon").innerHTML= "brightness_2";
        localStorage.setItem('theme', 'dark');
    }
    else {        
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById("theme-icon").innerHTML= "wb_sunny";
        localStorage.setItem('theme', 'light');
    }    
}

toggleSwitch.addEventListener('change', switchTheme, false);



