$("#search").off("click");
$(document).off("keypress");
$(document).off("ready");

function search() {
    var week = $("#week").val(),
        year = $("#year").val();

    if (week && year) {
        $.get("/partial/rota_view", {
            week: week,
            year: year
        }, function(res) {
            $("#content").fadeOut("fast", function() {
                $("#content").html(res);
                stopOverflow();
                M.AutoInit();
                $("#content").fadeIn("fast", function() {
                    if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                        $(".valign-wrapper").removeClass("valign-wrapper");
                    }
                });
            });
        });
    }
    else {
        M.toast({
            html: "Please enter a week number and year."
        });
    }
}

$("#search").click(function() {
    search();
});

$(document).on("keypress", function(e) {
    if (e.which == 13) {
        search();
    }
});

$(document).ready(function() {
    var d = new Date(),
        w = 0,
        y = 0;
    d.setUTCHours(0);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    var n = d.getTime() - 1547942400000;
    while (n >= 0) {
        n -= 604800000;
        if (n >= 0) {
            w += 1;
            if (w > 52) {
                w = 1;
                y += 1;
            }
        }
    }
    $("#week").html(w);
    $("#year").html(2019 + y);
});