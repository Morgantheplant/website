<?php
if(isset($_POST['email'])) {
     
    // EDIT THE 2 LINES BELOW AS REQUIRED
    $email_to = "morgantheplant@gmail.com";
    $email_subject = "morgantheplant.com: Email Message";
     
     
    function died($error) {
        // your error code can go here
        echo "<head>
        <meta charset=utf-8>
        <meta http-equiv=X-UA-Compatible content=IE=edge,chrome=1 >
        <title>MORGAN PLANT | BUYER EXTRORDINAIRE & ONLINE MARKETING GURU</title>
        <meta name=description content=Morgan&#32;Plant >
        <meta name=viewport content=width=device-width>
<link rel=icon 
      type=image/png 
      href=images/faviconmp.png >

		<LINK REL=SHORTCUT&#32;ICON HREF=images/favicon.ico /> 
        <link rel=stylesheet href=style.css>
 		<link href=&#39;http://fonts.googleapis.com/css?family=Hammersmith+One|Oswald|Open+Sans&#39; rel=&#39;stylesheet&#39; type=&#39;text/css&#39;>

    </head>
	
	  <header id=main_header>
				<ul>
					<li><a href=http://www.morgantheplant.com id=hometitle><img src=images/mpbig.png alt=Morgan&#32;Plant class=mp /></li>
					<li><h1 class=title >MORGAN PLANT</h1></li></ul></a>
						<h2 class=title >BUYER EXTRAORDINAIRE // ONLINE MARKETING GURU</h2>
				<img src=images/hr.png id=hr  />
			</header>
					<a href=http://www.morgantheplant.com/ class=morgmail2 ></a> <div id=phpmail > <h1 class=phped >ATTENTION: YOUR EMAIL DID NOT GO THROUGH DUE TO THE FOLLOWING ERRORS</h1></p> ";
        echo "These errors appear below.<br /><br />";
        echo $error."<br /><br />";
        echo "Please go<span id=extralink > <a href=http://www.morgantheplant.com/#contact >BACK</a></span> and fix these errors.<br /><br /></div>";
        die();
    }
     
    // validation expected data exists
    if(!isset($_POST['first_name']) ||
        !isset($_POST['last_name']) ||
        !isset($_POST['email']) ||
        !isset($_POST['telephone']) ||
        !isset($_POST['comments'])) {
        died('I am sorry, but there appears to be a problem with the form you submitted.');       
    }
     
    $first_name = $_POST['first_name']; // required
    $last_name = $_POST['last_name']; // required
    $email_from = $_POST['email']; // required
    $telephone = $_POST['telephone']; // not required
    $comments = $_POST['comments']; // required
     
    $error_message = "";
    $email_exp = '/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/';
  if(!preg_match($email_exp,$email_from)) {
    $error_message .= 'The Email Address you entered does not appear to be valid.<br />';
  }
    $string_exp = "/^[A-Za-z .'-]+$/";
  if(!preg_match($string_exp,$first_name)) {
    $error_message .= 'The First Name you entered does not appear to be valid.<br />';
  }
  if(!preg_match($string_exp,$last_name)) {
    $error_message .= 'The Last Name you entered does not appear to be valid.<br />';
  }
  if(strlen($comments) < 2) {
    $error_message .= 'The Comments you entered do not appear to be valid.<br />';
  }
  if(strlen($error_message) > 0) {
    died($error_message);
  }
    $email_message = "Form details below.\n\n";
     
    function clean_string($string) {
      $bad = array("content-type","bcc:","to:","cc:","href");
      return str_replace($bad,"",$string);
    }
     
    $email_message .= "First Name: ".clean_string($first_name)."\n";
    $email_message .= "Last Name: ".clean_string($last_name)."\n";
    $email_message .= "Email: ".clean_string($email_from)."\n";
    $email_message .= "Telephone: ".clean_string($telephone)."\n";
    $email_message .= "Comments: ".clean_string($comments)."\n";
     
     
// create email headers
$headers = 'From: '.$email_from."\r\n".
'Reply-To: '.$email_from."\r\n" .
'X-Mailer: PHP/' . phpversion();
@mail($email_to, $email_subject, $email_message, $headers);  
?>
 
<!-- include your own success html here -->
 

<head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title>MORGAN PLANT | BUYER EXTRORDINAIRE & ONLINE MARKETING GURU</title>
        <meta name="description" content="Morgan Plant's digital portfolio">
        <meta name="viewport" content="width=device-width">
<link rel="icon" 
      type="image/png" 
      href="images/faviconmp.png">

		<LINK REL="SHORTCUT ICON" HREF="images/favicon.ico" /> 
        <link rel="stylesheet" href="style.css">
 		<link href='http://fonts.googleapis.com/css?family=Hammersmith+One|Oswald|Open+Sans' rel='stylesheet' type='text/css'>

    </head> 
	
	  <header id="main_header">
				<ul>
					<li><a href="http://www.morgantheplant.com" id="hometitle"><img src="images/mpbig.png" alt="Morgan Plant" class="mp" /></li>
					<li><h1 class="title">MORGAN PLANT</h1></li></ul></a>
						<h2 class="title">BUYER EXTRAORDINAIRE // ONLINE MARKETING GURU</h2>
				<img src="images/hr.png" id="hr" alt="Click the side nav below" />
			</header>
					<a href="http://www.morgantheplant.com" class="morgmail"></a>
 <div id="phpmail"><p>Thanks for contacting me! I will get back to you as soon as I can!</p></div>
<?php
}
?>