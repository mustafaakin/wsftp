$(document).ready(function(){
	$('[rel=tooltip]').tooltip();
	var page = $("body").data("page");
	if ( page == "panel"){
//		$.get("/panel/personal-details", function(data){
		$.get("/panel/new-user/", function(data){
			$("#panel-content").html(data);			
		});
	}	
	$(".menu-button").click(function(){
		$("#menu-bar > .active").removeClass("active");
		$(this).parent().addClass("active");
		var path = $(this).attr("href");
		path = path.substr(1);
		$.get("/panel/" + path, function(data,error){
			$("#panel-content").html(data);
		});
		return false;
	});
});
