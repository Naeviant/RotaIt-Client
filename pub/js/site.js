// Prevent Vertically Aligned Elements from Overflowing
function stopOverflow() {
    // Compare Content Height with Window Height
    if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
        // Stop Vertical Alignment
        $(".valign-wrapper").removeClass("valign-wrapper");
    }
}

$(document).ready(function() {
    // Initialize All Materialize Elements
    M.AutoInit();
    // Prevent Page Overflow
    stopOverflow();
});

// Navigation
$(document).delegate(".sidenav a:not(#logout)", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/" + $(this).data("page"), function(res) {
        // Close Navigation Pane
        $(".sidenav").sidenav("close");
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle Log Out Button
$(document).delegate("#logout", "click", function() {
    // Send Log Out Request to Server
    $.post("/logout/", function() {
        // Send User to Root Page
        window.location = "/";
    });
});

// Load Initial Partial
$(document).ready(function() {
    // Check if Partial Already Loaded
    if (!$("#content").html().trim()) {
        // Click Team Button in Sidebar (Trigger Partial Change)
        $(".sidenav a[data-page='shifts']").click();
    }
});