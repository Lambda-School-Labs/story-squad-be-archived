import { Router } from 'express';
import { getRepository } from 'typeorm';
import { Transcribable, Transcription, Readability, Readable } from '../../models/internal/DS';
import { runScript } from '../../util/scripts/scripting';
import { attemptJSONParse, onlyTranscription } from '../../util/utils';
import { connection } from '../../util/typeorm-connection';
import { Only } from '../../middleware';
import { Child, Submissions } from '../../database/entity';
import { Pages } from '../../database/entity/Pages';

const submissionRoutes = Router();

submissionRoutes.get('/', Only(Child), async (req, res) => {
    try {
        const { submissions } = req.user as Child;
        return res.json({ submissions });
    } catch (err) {
        return res
            .status(500)
            .json({ message: 'Hmm... That did not work, please try again later.' });
    }
});

submissionRoutes.get('/:week', Only(Child), async (req, res) => {
    try {
        const { submissions } = req.user as Child;
        const submission = submissions.find(({ week }) => week === parseInt(req.params.week));
        if (!submission) throw Error('404');
        return res.json({ submission });
    } catch (err) {
        if (err.toString() === 'Error: 404')
            return res.status(404).json({ message: `Submission not found` });
        else
            return res
                .status(500)
                .json({ message: 'Hmm... That did not work, please try again later.' });
    }
});

submissionRoutes.post('/', Only(Child), async (req, res) => {
    try {
        const { storyText, illustration, story } = res.locals.body as Submissions;

        const { cohort, submissions } = req.user as Child;
        const { week } = cohort;

        if (submissions.find((e) => e.week === week)) throw Error('400');

        // Start DS integration
        let images = [];

        Object.values(story).forEach((page) => {
            if (page.length > 1) {
                images.push(page);
            }
        });

        const transcribed: Transcription | any = await transcribe({ images });

        if (!transcribed) {
            return res.status(400).json({ message: 'Something went wrong transcribing image.' });
        }

        // transcribed.images.forEach((story: string) => {
        //     readable({ story })
        //         .then((stats: Readability) => {
        //             // Save readability stats to db
        //             // Save transcribed text to db
        //             // await getRepository(readability, connection()).save({
        //             //     ...stats,
        //             //     transcribed_text: story
        //             // })
        //             console.log(stats);

        //             return res.status(200).json(stats);
        //         })
        //         .catch(console.error);
        // });

        console.log(transcribed.images);
        const readabilityStats: Readability | Transcription = await readable({
            story: transcribed.images[0],
        });

        // End DS integration

        // START OLD DB CODE
        // This will get replaced on the next merge with new database code
        try {
            const { child, ...submission } = await getRepository(Submissions, connection()).save({
                week,
                story,
                storyText,
                illustration,
                child: req.user,

                ...readabilityStats[0],
                transcribed_text: {
                    page1: transcribed.images[0] ? transcribed.images[0] : '',
                    page2: transcribed.images[1] ? transcribed.images[1] : '',
                    page3: transcribed.images[2] ? transcribed.images[2] : '',
                    page4: transcribed.images[3] ? transcribed.images[3] : '',
                    page5: transcribed.images[4] ? transcribed.images[4] : '',
                },
                // flesch_reading_ease: transcribed.images[0].flesch_reading_ease,
                // smog_index: transcribed.images[0].smog_index,
                // flesch_kincaid_grade: transcribed.images[0].flesch_kincaid_grade,
                // coleman_liau_index: transcribed.images[0].coleman_liau_index,
                // automated_readability_index: transcribed.images[0].automated_readability_index,
                // dale_chall_readability_score: readabilityStats[0].dale_chall_readability_score,
                // difficult_words: readabilityStats[0].difficult_words,
                // // needs to be a sum
                // linsear_write_formula: readabilityStats[0].linsear_write_formula,
                // gunning_fog: readabilityStats[0].gunning_fog,
                // consolidated_score: readabilityStats[0].consolidated_score,
                // doc_length: readabilityStats[0].doc_length,
                // // needs to be a sum
                // quote_count: readabilityStats[0].quote_count,
                // // needs to be a sum
                // transcribed_text: readabilityStats[0].transcribed_text,
                // // needs to be a concatenation
            });
            console.log(child);
            console.log(submission);
            console.log('the stuff');
            return res.status(201).json({ transcribed, submission });
        } catch (err) {
            console.log(err.toString());
            return res.status(500).json({ message: err.toString() });
        }

        // END OLD DB CODE

        // NEW DB CODE
        // await getRepository(story_submissions, connection()).save({
        // child_id: req.user.id,
        // cohorts_chapter_id: week,
        // image: JSON.stringify(data)
        // })

        // await getRepository(drawing_submissions, connection()).save({
        //     child_id: req.user.id,
        //     cohorts_chapter_id: week,
        //     image: illustration
        // })
        // END NEW DB CODE
        // removed 'transcribed' from json res return
    } catch (err) {
        if (err.toString() === 'Error: 400')
            return res.status(400).json({ message: `Submission already exists` });
        else
            return res
                .status(500)
                .json({ message: 'Hmm... That did not work, please try again later.' });
    }
});

submissionRoutes.delete('/:week', Only(Child), async (req, res) => {
    try {
        const reqWeek = parseInt(req.params.week);

        const { submissions } = req.user as Child;
        const submission = submissions.find(({ week }) => week === reqWeek);
        if (!submission) throw Error('404');

        const { affected } = await getRepository(Submissions, connection()).delete({
            week: reqWeek,
        });
        if (!affected) throw Error();

        return res.json({ submission });
    } catch (err) {
        if (err.toString() === 'Error: 404')
            return res.status(404).json({ message: `Submission not found` });
        else res.status(500).json({ message: 'Hmm... That did not work, please try again later.' });
    }
});

// Wrapper function that runs a specific script
// Parameters<typeof runScript>[1] is used to specify the second parameter type of `runScript`
function transcribe(data: Transcribable) {
    return runScript(
        './src/util/scripts/transcription.py', // Specifies the script to use, the path is relative to the directory the application is started from
        data, // The data to pass into stdin of the script
        (out: string[]) => out.map(attemptJSONParse).find(onlyTranscription) // A function to take the stdout of the script and find the result
    );
}

function readable(story: Readable) {
    return runScript(
        './src/util/scripts/readability.py', // Specifies the script to use, the path is relative to the directory the application is started from
        story, // The data to pass into stdin of the script
        (out: any) => out.map(attemptJSONParse) // A function to take the stdout of the script
    );
}

export { submissionRoutes };
