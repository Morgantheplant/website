	// create the module and name it famoUniApp
	var famoUniApp = angular.module('famoUniApp', ['ngRoute']);

  //add the ace editor
	var editor = ace.edit("editor");
    editor.setTheme("ace/theme/dawn");
    editor.getSession().setMode("ace/mode/javascript");
    editor.setFontSize(12)
    
    //creates a factory for all of the slides
    famoUniApp.factory('slideService', function($location, $http){
      console.log($location.url().split('/slide')[1])   
       var factory = {}
       
       //keep track of current slide
       factory.currentSlide = $location.url().split('/slide')[1] || 1;
       
       //updates the source of the render window
       factory.bundle = function() {
           return "./pages/example"+factory.currentSlide+"/index.html"
         }

       factory.showbuttons = function(){
       	 document.getElementsByClassName('slideButtons')[0].style.display = "block"
       }   

       //increments slide counter and changes route when next button is clicked  
       factory.nextSlide = function(){
		    if(factory.currentSlide < 8){
		  	  factory.currentSlide++;
			  $location.path('/slide'+ factory.currentSlide)    
		    }
		  }

      //prev button logic, reverse of above  
      factory.prevSlide = function(){
		    if(factory.currentSlide > 1){
		  	  factory.currentSlide--;
			    $location.path('/slide'+ factory.currentSlide)
		    }
		  }

      //grab and set content to the text editor
      factory.setContent = function(){
	   	  $http.get('./pages/example'+factory.currentSlide+'/code')
		      .success(function(data, status, headers,config){
			      //set value of editor to code in example folder
			      editor.setValue(data);
			
					//make slide 3 and 6 bigger font, slide 8 smaller
					if(factory.currentSlide===3||factory.currentSlide===6){
					    editor.setFontSize(16)
				    } else{
				      editor.setFontSize(12)
				    }
				    
					//deselects text after updating the value					
					editor.clearSelection();

		    }).error(function(data,status,headers,config){
			    console.error(data);
		    });
	    }

      //return factory object to be used in controllers
      return factory;
    });

	// configure routes
	famoUniApp.config(function($routeProvider, $provide) {
		$routeProvider

			// route for the home page
			.when('/', {
				templateUrl : './pages/home.html',
				controller  : 'mainController'
			})

			// route for the contact page
			.when('/contact', {
				templateUrl : './pages/contact.html',
				controller  : 'contactController'
			})

			.when('/browserify', {
				templateUrl : './copy/browserify.html',
				controller  : 'browserifyController'
			})
      
      .when('/slide1', {
      	templateUrl: './copy/intro.html',
	      controller  : 'slide1Controller'
      })

      .when('/slide2', {
      	templateUrl: './copy/slide2.html',
	      controller  : 'slide2Controller'
      })
      .when('/slide3', {
      	templateUrl: './copy/slide3.html',
	      controller  : 'slide3Controller'
      })
      .when('/slide4', {
      	templateUrl: './copy/slide4.html',
	      controller  : 'slide4Controller'
      })
      .when('/slide5', {
      	templateUrl: './copy/slide5.html',
	      controller  : 'slide5Controller'
      })
      .when('/slide6', {
      	templateUrl: './copy/slide6.html',
	      controller  : 'slide6Controller'
      })
      .when('/slide7', {
      	templateUrl: './copy/slide7.html',
	      controller  : 'slide7Controller'
      })
      .when('/slide8', {
      	templateUrl: './copy/slide8.html',
	      controller  : 'slide8Controller'
      })
	});

	// create the main controller for the app
	famoUniApp.controller('mainController', function($scope, $location, slideService) {
    
    
    //reset to first slide on home screen
    slideService.currentSlide = $location.url().split('/slide')[1] || 1;

		// create a message to display in our view
		$scope.message = "Learn the fundamentals of Famo.us Mixed Mode";
		
		//attach factory function for controlling next/prev buttons
		$scope.nextSlide = slideService.nextSlide
    $scope.prevSlide = slideService.prevSlide
    
    //add the source path to be referenced in the viewing window
    $scope.bundle = slideService.bundle
    
    //set init value of editor and hide buttons at homescreen 
    $scope.init = function(){
    	document.getElementsByClassName('slideButtons')[0].style.display = 'none'
    	editor.setValue('\n//Click \'Start the Lesson\' to begin\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
    	editor.clearSelection();
    }

    $scope.init(); 
	
	});

  //route with the contact information added
	famoUniApp.controller('contactController', function($scope) {
		$scope.mainText = 'Contact me!';
	});
  
  famoUniApp.controller('browserifyController', function($scope, slideService) {
    
    //reset to first slide on home screen
    slideService.currentSlide = 1;
    
    //set init value of editor and hide buttons at homescreen 
    $scope.init = function(){
    	document.getElementsByClassName('slideButtons')[0].style.display = 'none'
    	editor.setValue('\n\n\n//Click the link at the bottom of the text area to go back\n');
    	editor.clearSelection();
    }

    $scope.init(); 
	
	});


//skinny slide controllers  
  
  famoUniApp.controller('slide1Controller', function($scope, slideService) {
	    slideService.currentSlide = 1;
      slideService.showbuttons();
	    $scope.setContent = slideService.setContent;  
      $scope.setContent();
	});

	famoUniApp.controller('slide2Controller', function($scope, slideService) {
	  slideService.currentSlide = 2;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;
    $scope.setContent();
	});
    
  famoUniApp.controller('slide3Controller', function($scope, slideService) {
	  slideService.currentSlide = 3;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
	});

    
	famoUniApp.controller('slide4Controller', function($scope, slideService) {
	  slideService.currentSlide = 4;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
	});


  famoUniApp.controller('slide5Controller', function($scope, slideService) {
	  slideService.currentSlide = 5;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
    
    //hold the states of the links to hide/show   
    $scope.data = {
    	size:false,
    	content:false,
      properties:false
    }
    
    //simple toggle hide/show of links
    $scope.clicked = function(value){
      $scope.data[value] = !$scope.data[value]
    }

	});


	famoUniApp.controller('slide6Controller', function($scope, slideService) {
	  slideService.currentSlide = 6;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
	});


	famoUniApp.controller('slide7Controller', function($scope, slideService) {
	  slideService.currentSlide = 7;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
	});

	famoUniApp.controller('slide8Controller', function($scope, slideService) {
	  slideService.currentSlide = 8;
	  slideService.showbuttons();
	  $scope.setContent = slideService.setContent;  
    $scope.setContent();
	});



