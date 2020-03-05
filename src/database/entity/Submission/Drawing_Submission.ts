import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
    OneToMany,
} from 'typeorm';
import { Child } from '../User/Child';
import { Cohort_Canon } from '../Story/Cohort_Canon';
import { Drawing_Feedback } from '../Feedback/Drawing_Feedback';
@Entity()
class Drawing_Submission {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Child)
    @JoinColumn()
    child_id: Child;

    //cohort chapter - one to many
    @ManyToOne(
        () => Cohort_Canon,
        (cohort_canon) => cohort_canon.id
    )
    cohort_canon: Cohort_Canon[];

    //drawing_feedback ref - 3.4.20
    @OneToMany(
        () => Drawing_Feedback,
        (drawing_feedback) => drawing_feedback
    )
    drawing_feedback: Drawing_Feedback[];

    @Column()
    cohort_chapters_id: number;

    @Column()
    image: string;

    @Column()
    allocated_points: number;

    @Column()
    final_points: number;

    @Column()
    high_bracket: boolean;

    @Column()
    low_bracket: boolean;

    @Column()
    win: boolean;

    @Column()
    date: Date;

    @Column()
    votes: number;
}

export { Drawing_Submission };
