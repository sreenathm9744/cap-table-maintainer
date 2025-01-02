namespace samples.db;
using { cuid, managed } from '@sap/cds/common';

entity Books : cuid , managed{
  title  : String;
  descr  : String;
  genre  : Genre;
  author : Association to Authors;
  field1: String;
  field2 : String;
  field3: String;
  field4: String;
  field5 :String;
  field6 : String;
  field7: String;
  field8: String;
  field9: String;
  field10 : String;
  field11: String;
  field12: String;
  field13 : String;
  field14 : String;
  field15: String;
  field16: String;

}

entity Authors : cuid {
  name   : String;
  books  : Association to many Books on books.author = $self;
}

type Genre : String enum {
  Mystery; Fiction; Drama;
}