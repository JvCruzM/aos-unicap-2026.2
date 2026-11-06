import argon2 from "argon2";

const getUserModel = (sequelize, { DataTypes }) => {
  const User = sequelize.define("user", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    legacyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [7, 42] },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  });

  const generatedHashes = new WeakMap();
  User.addHook("beforeValidate", (user, options) => {
    if ((!user.isNewRecord && !user.changed("password")) ||
        (generatedHashes.has(user) && generatedHashes.get(user) === user.password)) {
      options.skip = [...(options.skip || []), "password"];
    }
  });
  const hashPassword = async (user) => {
    if (user.changed("password") && generatedHashes.get(user) !== user.password) {
      user.password = await argon2.hash(user.password);
      generatedHashes.set(user, user.password);
    }
  };
  User.addHook("beforeCreate", hashPassword);
  User.addHook("beforeUpdate", hashPassword);

  User.prototype.validatePassword = async function (password) {
    return await argon2.verify(this.password, password);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get({ plain: true }) };
    delete values.password;
    return values;
  };

  User.associate = (models) => {
    User.hasMany(models.Message, { foreignKey: "userId", onDelete: "CASCADE" });
  };

  User.findByLogin = async (login) => {
    let user = await User.findOne({
      where: { username: login },
    });

    if (!user) {
      user = await User.findOne({
        where: { email: login },
      });
    }

    return user;
  };

  return User;
};

export default getUserModel;
