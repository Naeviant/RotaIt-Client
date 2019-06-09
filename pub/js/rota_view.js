$(document).off("ready");
$("#previous").off("click");
$("#next").off("click");

function colour() {
    $.get("/week/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        if (res.status === 200) {
            $.get("/events/", {
                week: $("#header").data("week"),
                year: $("#header").data("year")
            }, function(resp) {
                if (resp.status === 200) {
                    $("#rota tbody tr td").removeClass("yellow orange pink lighten-5")
                    var keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                    $("#rota tbody tr").each(function(i) {
                        var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1];

                        for (var event of resp.events) {
                            for (var j = 1; j <= 7; j++) {
                                var boundary = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                                if (boundary >= event.from && boundary <= event.to && event.staffNumber == staffNumber) {
                                    if (event.type == "interviewing" || event.type == "course") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("green lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("green lighten-5");
                                    }
                                    if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed purple");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed purple");
                                    }
                                    if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed blue");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed blue");
                                    }
                                    if (event.type == "suspension") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed red");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed red");
                                    }
                                    if (event.type == "elsewhere") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed black");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed black");
                                    }
                                }
                            }
                        }
                        var n = 0;
                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
                            if (j === 0) {
                                return true;
                            }
                            var today = keys[new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getDay()];
                            if (today == "sun") {
                                if (j % 2 === 0) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                        if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").hasClass("lighten-5") && !$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                        }
                                    }
                                    n++;
                                }
                                return true;
                            }
                            if (j % 2 === 1) {
                                var start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[1]))).getTime(),
                                    open = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["openCustomers"]).getTime();
                                if (start <= open) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").html().trim()) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("yellow lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("yellow lighten-5");
                                    }
                                }
                            }
                            else if (j % 2 === 0) {
                                var end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[1]))).getTime(),
                                    closed = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["closedCustomers"]).getTime();
                                if (end >= closed) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("pink lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("pink lighten-5");
                                    }
                                }
                                if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                    if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").hasClass("lighten-5") && !$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                    }
                                }
                                n++;
                            }
                        });
                    });
                }
            });

        }
        else {
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
}

$(document).ready(function() {
    $("#rota thead tr:nth-of-type(2) td").each(function(i) {
    var d = new Date(1547942400000 + (parseInt($("#header").data("week")) * 604800000) + ((parseInt($("#header").data("year")) - 2019) * 31536000000) - (Math.floor((parseInt($("#header").data("year")) - 2016) / 4) * 86400000) + (i * 86400000));
        $(this).html(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
    });
    $.get("/rota/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        if (res.status === 200) {
            $("#rota tbody tr").each(function(i) {
                var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
                    shifts = res.rota.filter(function(x) { return x.staffNumber == staffNumber });

                for (var j = 1; j <= 7; j++) {
                    var lower = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                    var higher = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]), 23, 59, 59)).getTime();
                    for (var shift of shifts) {
                        if (shift.start > lower && shift.end < higher) {
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((2 * j)) + ")").html(("0" + new Date(shift.start).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.start).getUTCMinutes()).slice(-2));
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((2 * j) + 1) + ")").html(("0" + new Date(shift.end).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.end).getUTCMinutes()).slice(-2));
                        }
                    }
                }
            });
            colour();
            $("#loading").fadeOut("fast", function() {
                $("#wrapper").fadeIn();
                stopOverflow();
            });
        }
        else {
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
});

$("#previous").click(function() {
     var week = $("#header").data("week") - 1,
        year = $("#header").data("year");

    if (week < 1) {
        week = 52;
        year -= 1;
    }

    $.get("/partial/rota_view", {
        week: week,
        year: year
    }, function(res) {
        $("#content").fadeOut("fast", function() {
            $("#content").html(res);
            $('.material-tooltip').remove();
            stopOverflow();
            M.AutoInit();
            $("#content").fadeIn("fast", function() {
                if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                    $(".valign-wrapper").removeClass("valign-wrapper");
                }
            });
        });
    });
});

$("#next").click(function() {
     var week = $("#header").data("week") + 1,
        year = $("#header").data("year");

    if (week > 52) {
        week = 1;
        year += 1;
    }

    $.get("/partial/rota_view", {
        week: week,
        year: year
    }, function(res) {
        $("#content").fadeOut("fast", function() {
            $("#content").html(res);
            $('.material-tooltip').remove();
            stopOverflow();
            M.AutoInit();
            $("#content").fadeIn("fast", function() {
                if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                    $(".valign-wrapper").removeClass("valign-wrapper");
                }
            });
        });
    });
});