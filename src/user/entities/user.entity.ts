import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;
  
  @Column()
  name: string;

  @Column({ nullable: true })
  verificationToken: string;


  @Column({ default: false })
  isVerified: boolean;

  // Add other necessary fields like name, etc.
}
