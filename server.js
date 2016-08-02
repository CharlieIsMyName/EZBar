var express = require('express');
var app=express();
var port=process.env.PORT||8080;
var fs=require("fs");
var bodyParser = require('body-parser');
var url=require("url");
var querystring=require("querystring");
var session=require("client-sessions");

var mongo=require("mongodb");
var monk=require("monk");
var dburl=process.argv[3];  //dburl will be the second argument

const db=monk(dburl);
const loginCollectionName="ezbar-login"

var Yelp=require('yelp');
var yelpKey=require('./key.json');
var yelp=new Yelp(yelpKey);


function isValid(str) { return /^\w+$/.test(str); };      //the function that checks if a string is purely composed of number and alphabets

app.set("views",__dirname+"/client");
app.set("view engine","jade");

app.use(express.static(__dirname+'/client'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  cookieName: "session",
  secret: process.argv[2],            //session secret will be the first argument
  duration: 60*60*1000,               //one hour in length
  activeDuration: 60*60*1000
}));

app.use(function(req,res,next){
  req.db=db;
  next();
})

app.get('/',function(req,res){
  if(req.session.lastLocation){
    yelp.search({term: "bar", location: req.session.lastLocation})
    .then(function(d){
      var urlList=[];   //all the mobile_url in d. In this case the url will be the unique identifier of the business
      for(var i=0;i<d.businesses.length;i++){
        urlList.push(d.businesses[i].mobile_url);        
      }
      
      req.db.collection("ezbar-data").find({url:{$in: urlList}},function(err,entry){
        if(err) throw err;
        var data=d.businesses;
        
        for(var i=0;i<entry.length;i++){
          for(var j=0;j<data.length;j++){
            if(entry[i].url==data[j].mobile_url){    //if url match, create count property based on usernameList.length
              data[j].count=entry[i].usernameList.length;
            }
          }
        }
        
        res.render("index",{
          user: req.session.user,
          data: data,
          location: req.session.lastLocation
        });
        return;
      });
      
      
      return;
    })
    .catch(function(err){
      res.render("index",{
          user: req.session.user,
          err: true
        });
    });
  }
  else{
    res.render("index",{
      user: req.session.user
    });
  }
});

app.post('/',function(req,res){
  if(req.body.location){
    req.session.lastLocation=req.body.location;
    res.redirect('/');
    return;
  }
  else if(req.body.url){
    if(req.session||req.session.user){   //only user logged in can proceed
      var url=req.body.url;
      
      req.db.collection("ezbar-data").find({url: url},function(err,data){
        if(err)throw err;
        
        
        var length=0;
        if(data.length==0){   //the place is not inserted in the database yet
          req.db.collection("ezbar-data").insert({url: url, usernameList: [req.session.user.username]});
          length=1;
          res.redirect('/');
          return;
        }
        else{   //the url already exist. check if the user is already in it.
          var usernameList=data[0].usernameList;      //normally duplication of url SHOULD NEVER HAPPEN! so we will choose the first one
          for(var i=0;i<usernameList.length;i++){
            if(usernameList[i]==req.session.user.username){    //found name. remove from the list and update it.
              usernameList.splice(i,1);
              req.db.collection("ezbar-data").update({url:url},{url:url,usernameList:usernameList});
              res.redirect('/');
              return;
            }
          }
          
          //else we add the username into the username list
          usernameList.push(req.session.user.username);
          req.db.collection("ezbar-data").update({url:url},{url:url,usernameList:usernameList});
          res.redirect('/');
          return;
          
        }
        
        
        
      })
    }
    else{
      res.redirect('/signin');
    }
  }
  
});

app.get('/signup',function(req,res){
  res.render("signup",
  {
      err: querystring.parse(url.parse(req.url).query).err,
      user: req.session.user
  });
});

app.post('/signup',function(req,res){
  console.log(req.body);
  var loginCollection=req.db.collection(loginCollectionName);
  
  //if the signup input is invalid 
  if(!req.body.username||!req.body.password||!req.body["re-password"]){
    res.redirect("/signup?err=empty");
    return;
  }
  if(req.body.password!=req.body["re-password"]){
    res.redirect("/signup?err=notMatch");
    return;
  }
  if(!isValid(req.body.username)||!isValid(req.body.password)||!isValid(req.body["re-password"])){
    res.redirect("/signup?err=invalid");
    return;
  }
  
  loginCollection.count({"username": req.body.username},function(err,count){
    if(err){
      throw err;
    }
    if(count!=0){
      res.redirect("/signup?err=exist");
      return;
    }
    
    
    loginCollection.insert({
      username: req.body.username,
      password: req.body.password             
    });
    
    req.session.user={
      username: req.body.username
    }
    console.log("yes!");
    res.redirect('/');
    return;
  })
  
  
});

app.get('/signin',function(req,res){
  res.render("signin",
  {
      err: querystring.parse(url.parse(req.url).query).err,
      user: req.session.user
  });
});

app.post('/signin',function(req,res){
  console.log(req.body);
  var loginCollection=req.db.collection(loginCollectionName);
  
  if(!req.body.username||!req.body.password){
    res.redirect("/signin?err=invalid");
    return;
  }
  
  loginCollection.find({username: req.body.username, password: req.body.password},function(err,data){
    if(err){
      throw err;
    }
    
    if(data.length==0){          //if anything is wrong, login failed
      res.redirect("/signin?err=invalid");
      return;
    }
    
    req.session.user={          //else, login to session and go to the main page
      username: req.body.username
    }
    
    res.redirect('/');
    return;
  });
  
});

app.get('/signout',function(req,res){
  req.session.reset();
  res.redirect('/');
  return;
});

app.listen(port,function(){
  console.log("the app is listening on port "+port);
});

