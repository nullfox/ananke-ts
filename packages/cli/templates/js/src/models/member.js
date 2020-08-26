import {
  DataTypes,
  Model,
  Op,
} from '@ananke/sequelize';

export default class Member extends Model {
  static setup(sequelize, modelConfig = {}) {
    return this.init(
      {
        name: {
          type: DataTypes.STRING,
        },
        email: {
          type: DataTypes.STRING,
          unique: true,
        },
      },
      {
        sequelize,
      },
    );
  }

  static associate(models) {
  }

  static async findByEmailOrUsername(emailOrUsername, password) {
    return this.findOne({
      where: {
        [Op.or]: [
          {
            name: emailOrUsername,
          },
          {
            email: emailOrUsername,
          },
        ]
      },
    })
  }
}
