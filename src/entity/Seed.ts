import {Entity, PrimaryGeneratedColumn, Column, Index} from "typeorm";

@Entity()
export class Seed {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Index({unique: true})
  @Column({length: 64})
  USI_PN!: string;

  @Column({length: 64})
  Manufacturer_Name!: string;

  @Column({length: 64})
  Manufacturer_PN!: string;

  @Column({length: 128})
  Label!: string;

  @Column({
    type: "timestamp",
    default: ()=>"CURRENT_TIMESTAMP"
  })
  Created_Date!: Date;

  @Column({
    type: "timestamp",
    default: null
  })
  Updated_Date!: Date;

}
