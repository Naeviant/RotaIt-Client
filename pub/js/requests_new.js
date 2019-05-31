$(document).delegate("#cancel-request", "click", function() {
    $(".sidenav a[data-page='requests']").click();
});

$(document).delegate("#save-request", "click", function() {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        from = Date.UTC(parseInt($("#from").val().split(" ")[3]), months.indexOf($("#from").val().split(" ")[2]), parseInt($("#from").val().split(" ")[1])),
        to = Date.UTC(parseInt($("#to").val().split(" ")[3]), months.indexOf($("#to").val().split(" ")[2]), parseInt($("#to").val().split(" ")[1])),
        comment = $("#comment").val();

    if (from && !isNaN(from) && to && !isNaN(to) && from <= to) {
        $.post("/requests/", {
            from: from,
            to: to,
            comment: comment
        }, function(res) {
            if (res.status === 200) {
                $(".sidenav a[data-page='requests']").click();
            }
            else {
                
            }
        });
    }
    else {
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});