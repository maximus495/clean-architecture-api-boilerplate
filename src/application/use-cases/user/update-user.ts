import { EmailValidationError } from '~/application/errors/email-validation-error';
import { NotFoundError } from '~/application/errors/not-found-error';
import { RepositoryError } from '~/application/errors/repository-error';
import { FindUserByEmailRepository } from '~/application/ports/repositories/find-user-by-email-repository';
import { FindUserByIdRepository } from '~/application/ports/repositories/find-user-by-id-repository';
import { UpdateUserRepository } from '~/application/ports/repositories/update-user-repository';
import { PasswordHashing } from '~/application/ports/security/password-hashing';
import { UpdateUserRequestModelBody } from '~/application/ports/user/models/update-user-request-model';
import { UpdateUserUseCase } from '~/application/ports/user/use-cases/update-user-use-case';
import { User } from '~/domain/user/user';

export class UpdateUser implements UpdateUserUseCase {
  constructor(
    private readonly updateUserRepository: UpdateUserRepository,
    private readonly findUserByIdRepository: FindUserByIdRepository,
    private readonly findUserByEmailRepository: FindUserByEmailRepository,
    private readonly passwordHashing: PasswordHashing,
  ) {}

  async update(
    id: string,
    request: UpdateUserRequestModelBody,
  ): Promise<User | never> {
    const foundUser = await this.findUserByIdRepository.findById(id);

    if (!foundUser) {
      throw new NotFoundError('User does not exist');
    }

    const newRequest = { ...request };
    const newPassword = newRequest.password;
    const newEmail = newRequest.email;

    if (newEmail) {
      const foundEmail = await this.findUserByEmailRepository.findByEmail(
        newEmail,
      );

      if (foundEmail) {
        throw new EmailValidationError('E-mail already in use.');
      }
    }

    if (newPassword) {
      newRequest.password_hash = await this.passwordHashing.hash(newPassword);
    }

    delete newRequest.password;
    delete newRequest.confirmPassword;
    const updatedRows = await this.updateUserRepository.update(id, newRequest);

    if (updatedRows === 0) throw new RepositoryError('Could not update user');
    return { ...foundUser, ...newRequest };
  }
}
