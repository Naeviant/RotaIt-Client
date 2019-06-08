$(document).undelegate("#new-request", "click");
$(document).undelegate("#view-request", "click");
$(document).undelegate("#delete-request", "click");

$(document).delegate("#new-request", "click", function() {
    $.get("/partial/requests_new", function(res) {
        $("#content").fadeOut("fast", function() {
            $("#content").html(res);
            $('.material-tooltip').remove();
            M.AutoInit();
            $('.datepicker').datepicker({
                format: "ddd dd mmm yyyy"
            });
            M.updateTextFields();
            $("#content").fadeIn("fast", function() {
                if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                    $(".valign-wrapper").removeClass("valign-wrapper");
                }
            });
        });
    });
});

$(document).delegate("#view-request", "click", function() {
    $("#delete-request").data("user", $(this).data("user"));
    $("#delete-request").data("from", $(this).data("from"));
    $("#delete-request").data("to", $(this).data("to"));
    if ($(this).data("mycomments")) {
        $("#my-comments").html($(this).data("mycomments"));
    }
    else {
        $("#my-comments").html("<em>None</em>");
    }
    if ($(this).data("managercomments")) {
        $("#manager-comments").html($(this).data("managercomments"));
    }
    else {
        $("#manager-comments").html("<em>None</em>");
    }
    $("#modal-request").modal("open");
});

$(document).delegate("#delete-request", "click", function() {
    var from = $(this).data("from"),
        to = $(this).data("to");
    $.ajax({
        url: "/request/",
        type: "DELETE",
        data: {
            staffNumber: $(this).data("user"),
            from: from,
            to: to
        },
        success: function(res) {
            switch (res.status) {
                case 200:
                    $("[data-from=" + from + "][data-to=" + to + "]").parent().parent().fadeOut();
                    break;
                case 400:
                    M.toast({
                        html: "An unknown error occured. Please try again later."
                    });
                    break;
                case 403:
                    M.toast({
                        html: "Your session has expired. Please log in again to continue."
                    });
                    break;
                case 500:
                    M.toast({
                        html: "The system could not contact the server. Please try again later."
                    });
                    break;
            }
        }
    });
});