function myFunction () {
    var moreText = document.getElementById("more-text");
    var buttonText = document.getElementById("read-more-button");
    var dots = document.getElementById("dots");

    if(dots.style.display === "none") {
        dots.style.display = "inline";
        buttonText.innerHTML = "Read more";
        moreText.style.display = "none";
    } else {
        dots.style.display = "none";
        buttonText.innerHTML = "Show less";
        moreText.style.display = "inline";
    }
}