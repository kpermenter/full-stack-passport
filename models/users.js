'use strict';
module.exports = (sequelize, DataTypes) => {
  const users = sequelize.define('users', {
    username: DataTypes.STRING,
    password: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {});
  users.associate = function(models) {
    // associations can be defined here
  };
  return users;
};