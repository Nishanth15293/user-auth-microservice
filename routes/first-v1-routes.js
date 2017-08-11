/**
 * @name first-v1-api
 * @description This module packages the First API.
 */
'use strict';

const hydraExpress = require('hydra-express');
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require('fwsp-server-response');
const config = require('../config/config.json');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/osthustest');
mongoose.promise = global.Promise;

const User = require('../models/UserModel');
const createJWT = require('../utils/createJWT');
const jwt = require('jwt-simple');
const moment = require('moment');


let serverResponse = new ServerResponse();
express.response.sendError = function(err) {
  serverResponse.sendServerError(this, {result: {error: err}});
};
express.response.sendOk = function(result) {
  serverResponse.sendOk(this, {result});
};

let api = express.Router();

/**
 * Sanity Check for the service
 */
api.get('/',
(req, res) => {
  res.sendOk({msg: `hello from ${hydra.getServiceName()}} - ${hydra.getInstanceID()}`});
});

/**
 * Retrieve/Get a list of All the registered Users
 */
api.get('/users',
(req, res) => {
  var sortObj = {};
  var query = req.params.qry || {};
  if(req.query.sorted){
    var sortArray = JSON.parse(req.query.sorted);
    sortArray.forEach(function(sort, i){
        var order = sort.desc == false? 1 : -1;
        sortObj[sort.id] = order
    });
  }

  if(req.query.filtered){
    var filterArr = JSON.parse(req.query.filtered);
    filterArr.forEach(function(filter, i){
        query[filter.id] = {'$regex':filter.value}
    });
  }
    
  var options = {
      sort: sortObj || {},
      page: parseInt(req.params.page) || 1,
      limit: parseInt(req.params.pageSize) || 50
  }

  User.paginate(query, options, function(err, users){
      if(err) throw err;
      users.docs.map(user => {user.toJSON()});
      res.status(200).send(users);
  });
});


/**
 * Register/Create a new User
 */
api.post('/user',
(req, res) => {
  console.log(`from ${hydra.getServiceName()}} - ${hydra.getInstanceID()}`);
  var role = "user";
    var user = req.body;
    User.findOne({email: user.email},function(err, userFound) {
        if (err) throw err;

        if(userFound){
          res.send({error: 'User already exists. Try login', errorCode: 401});
        } else {
          if(user.email === config.SUPER_ADMIN) {
              role = "superadmin";
          }
          var newUser = new User({
              name: user.name,
              email: user.email,
              password: user.password,
              phone: user.phone,
              avatarURL: user.avatarURL,
              role: role,
              updated_at: moment().format('MM/DD/YYYY'),
              userActivity: ['User Registered']
              
          });

          newUser.save((err)=> {
              var token = createJWT(newUser, config.SECRET);
              res.status(200).send({
                  user:newUser.toJSON(),
                  token:token
              });
          })
        }
    });
});


/**
 * Update an existing User
 */
api.put('/user/:id',
(req, res) => {
  console.log(`from ${hydra.getServiceName()}} - ${hydra.getInstanceID()}`);
  var updateUser = req.body;
    var userId = req.params.id;
    User.findById(userId, function(err, user){
      if(err) throw err;
      user.name = updateUser.name;
      user.phone = updateUser.phone;
      user.role = updateUser.role;
      user.avatarURL = updateUser.avatarURL;
      user.userActivity.push('user details updated');
      user.updated_at = moment().format('MM/DD/YYYY');

      user.save(function (err) {
          if(err) throw err;
          res.status(200).send({
              user:user.toJSON()
          });
      });
    });
});


/**
 * Get Details of an existing User
 */
api.get('/user/:id',
(req, res) => {
  console.log(`from ${hydra.getServiceName()}} - ${hydra.getInstanceID()}`);
    var userId = req.params.id;
    User.findById(userId, function(err, user){
        if(err) throw err;

        if(!user) 
          res.status(400).send({message: 'User not Found!'});

        res.status(200).send({
            user:user.toJSON()
        });
    });
});


/**
 * Delete an existing User
 */
api.delete('/user/:id',
(req, res) => {
  console.log(`from ${hydra.getServiceName()}} - ${hydra.getInstanceID()}`);
    var userId = req.params.id;
    User.findByIdAndRemove(userId, function(err,user) {
      if(err) throw err;
      console.log(res);
      res.status(200).send({
          message: 'deleted'
      });
    });
});


/**
 * User Login
 */
api.post('/login',
(req, res) => {
  req.user = req.body;
  User.findOne({email: req.user.email}, function(err, user){
      if(err) throw err

      if(!user)
          return res.status(401).send({message: 'Email not found'});
      
      user.comparePasswords(req.user.password, function(err, isMatch){
          console.log(isMatch);
          if(err) throw err;

          if(!isMatch)
              return res.status(401).send({message: 'Wrong password'});

          var token = createJWT(user, config.SECRET);
          res.status(200).send({
              user:user.toJSON(),
              token:token
          });
      })
  })
});


module.exports = api;
