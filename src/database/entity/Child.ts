import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

import { Parent, Submissions } from '../entity';
import { Preferences } from './Preferences';

@Entity()
class Child {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(
        (type) => Parent,
        (parent) => parent.children
    )
    parent: Parent;

    @Column()
    username: string;

    @Column()
    week: number;

    @Column()
    grade: number;

    @Column((type) => Preferences)
    preferences: Preferences;

    @Column({ default: false })
    subscription: boolean;

    @OneToMany(
        (type) => Submissions,
        (submissions) => submissions.child
    )
    public submissions?: Submissions[];
}

export { Child };
