'use strict';
module.exports = (sequelize, DataTypes) => {
  const users = sequelize.define('users', {
    username: DataTypes.STRING,
    password: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {});
  // associations can be defined here
  
  //  users.associate = function(models) {
  //   users.hasOne(models.username, {
  //     foreignKey: 'user_id',
  //     as: 'username',
  //   });
  //   users.belongsToMany(models.Article, {
  //     as: 'article',
  //     foreignKey: 'user_id'
  //   });
  // };
  return users;
};