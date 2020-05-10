$(document).on('ready', function(){
   

   $(this).on('click', '.clicker div', function(e){
   	  e.stopPropagation();
   	  $('img').css('border', '10px outset rgb(165, 170, 169)');
      var imgSrc = "./images/" + $(this).attr('class') + ".jpg";
      console.log(imgSrc);
      $('img').toggle();
      $('img').draggable();
      $('.main').attr('src', imgSrc);
   });

   $(this).on('mouseenter', '.clicker div', function(){
     $(this).fadeTo(.5,.5); 
   });

    $(this).on('mouseout', '.clicker div', function(){
     $(this).fadeTo(.5,1); 
   });

});