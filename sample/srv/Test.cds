using { samples.db as my } from '../db/schema';
service AdminService {
  entity Books as projection on my.Books;
  entity Authors as projection on my.Authors;
}
