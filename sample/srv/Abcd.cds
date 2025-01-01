using { samples.db as my } from '../db/schema';
service abfv @(path:'/cat') {
  entity Viewssf as projection on my.Books;
  entity Authors as projection on my.Authors;
}
