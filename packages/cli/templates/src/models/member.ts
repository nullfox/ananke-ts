import {
  DataTypes,
  Model,
  ModelConfig,
  Models,
  Op,
  Sequelize,
} from '@ananke/sequelize';

export default class Member extends Model {
  static setup(sequelize: Sequelize, modelConfig: ModelConfig = {}) {
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

  static associate(models: Models) {
  }

  static async findByEmailOrUsername(emailOrUsername: string, password: string): Promise<Member | null> {
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
