import{al as G,a6 as Q,u as K,r as H,L as E,j as S}from"./vendor-BfsXFn1x.js";import{p as V,R,ab as Y,O as Z,Y as J,i as ee,ac as te,Z as ae,_ as ie}from"./index-CgxDhufT.js";import"./threejs-DngalnUX.js";import"./supabase-9NZ6MRFe.js";import"./icons-BCvBKU3V.js";import"./leaflet-DtNId1PC.js";const oe={save:"შენახვა",cancel:"გაუქმება",delete:"წაშლა",edit:"რედაქტირება",add:"დამატება",create:"შექმნა",close:"დახურვა",back:"უკან",done:"დასრულება",next:"შემდეგი",skip:"გამოტოვება",continue:"გაგრძელება",confirm:"დადასტურება",send:"გაგზავნა",resend:"ხელახლა გაგზავნა",remove:"წაშლა",yes:"კი",no:"არა",ok:"კარგი",localeTag:"ka-GE",loading:"იტვირთება…",retry:"ხელახლა ცდა",search:"ძიება",empty:"ცარიელია",draft:"დრაფტი",completed:"დასრულდა",required:"სავალდებულო",optional:"სურვილის შემთხვევაში",all:"ყველა",new:"ახალი",project:"პროექტი",inspection:"შემოწმების აქტი",certificate:"სერტიფიკატი",qualification:"სერტიფიკატები",signature:"ხელმოწერა",signer:"ხელმომწერი",status:"სტატუსი",date:"თარიღი",name:"სახელი",company:"კომპანია",address:"მისამართი",phone:"ტელეფონი",position:"პოზიცია",role:"როლი",email:"ელ-ფოსტა",password:"პაროლი",help:"დახმარება"},ne={close:"დახურვა",closeHint:"შეეხეთ დასახურად",addPhoto:"ფოტოს დამატება",addPhotoHint:"შეეხეთ ახალი ფოტოს ასატვირთად",viewPhoto:"ფოტოს ნახვა",viewPhotoHint:"შეეხეთ ფოტოს დიდად სანახავად",deleteSigner:"მონაწილის წაშლა",deleteSignerHint:"ამ მონაწილის წაშლა",deleteMember:"წაშლა",deleteMemberHint:"მონაწილის წაშლა",addMember:"დამატება",addMemberHint:"ახალი მონაწილის დამატება",saveSignature:"შენახვა",saveSignatureHint:"ხელმოწერის შენახვა",clearSignature:"გასუფთავება",clearSignatureHint:"ხელმოწერის გასუფთავება",selectRole:"აირჩიეთ როლი",selectTemplate:"აირჩიეთ შაბლონი",backToInspection:"შემოწმების აქტი — დაბრუნება",backToInspectionHint:"გადავა შემოწმების აქტის ეკრანზე",retryLoading:"ხელახლა ცდა",newCertificate:"ახალი სერტიფიკატი",newCertificateHint:"სერტიფიკატის დამატება",closeSheet:"დახურვა",closeSheetHint:"ფორმის დახურვა",closePreview:"დახურვა",closePreviewHint:"პრევიუს დახურვა",resumeDraft:"შევსების გაგრძელება",help:"დახმარება"},se={unknown:"უცნობი შეცდომა",invalidEmailOrPassword:"არასწორი ელ-ფოსტა ან პაროლი",confirmEmailFirst:"გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა",passwordTooShort:"პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",tooManyAttempts:"ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ",network:"ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი",operationCancelled:"ოპერაცია გაუქმდა",notFound:"მონაცემი ვერ მოიძებნა",forbidden:"წვდომა აკრძალულია",alreadyExists:"უკვე არსებობს",requiredField:"სავალდებულო ველი",invalidPhoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",deleteFailed:"წაშლა ვერ მოხერხდა",createFailed:"შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",uploadFailed:"ატვირთვა ვერ მოხერხდა",generationFailed:"გენერაცია ვერ მოხერხდა",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",loadFailed:"ჩატვირთვა ვერ მოხერხდა",previewFailed:"პრევიუს ჩატვირთვა ვერ მოხერხდა",invalidAnswerFormat:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",needsInternetForPhoto:"ფოტოს ასატვირთად საჭიროა ინტერნეტი",cameraPermission:"კამერაზე წვდომა საჭიროა",galleryPermission:"გალერეაზე წვდომა საჭიროა",authRequired:"ავტორიზაცია საჭიროა",photoPermission:"ფოტოზე წვდომა არ არის",notFoundInspection:"შემოწმების აქტი ვერ მოიძებნა",notFoundTemplate:"შაბლონი არ არის",notFoundProject:"პროექტი ვერ მოიძებნა",missingQualification:"აკლია სერტიფიკატები",missingQualificationDesc:"მიუთითეთ: {{types}}",signatureRequired:"ხელმოწერა საჭიროა",signatureRequiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",missingFields:"შეავსეთ: {{fields}}",pdfNotGeneratedYet:"ჯერ დააგენერირე PDF რეპორტი",inspectionNotSpecified:"შემოწმების აქტი არ არის მითითებული",dataStillLoading:"მონაცემები ჯერ იტვირთება",googleCalendarNotConnected:"ჯერ მიაერთეთ Google კალენდარი",googleSessionExpired:"Google სესია ამოიწურა — შეაერთე თავიდან",googleCalendarDisconnected:"Google კალენდარი გაითიშა",googleCalendarConnected:"Google კალენდარი შეერთდა"},re={channelName:"შემოწმების აქტის შეხსენება",fallbackItemName:"შემოწმების აქტი",expiringTomorrowTitle:"ვადა გასდის ხვალ",addedToCalendar:"დაემატა: {{count}}",smsSent:"SMS გაიგზავნა",smsResent:"SMS ხელახლა გაიგზავნა",pdfDeleted:"PDF რეპორტი წაიშალა",requestDeleted:"მოთხოვნა წაიშალა",certificateUploaded:"სერტიფიკატი აიტვირთა",photoUploaded:"ფოტო აიტვირთა",photoDeleted:"ფოტო წაიშალა",signatureSaved:"ხელმოწერა შენახულია",projectCreated:"პროექტი შეიქმნა",undoLabel:"დაბრუნება",draftLoaded:"ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.",deleted:"წაიშალა",languageChanged:"ენა შეიცვალა",signedOut:"გასვლა შესრულდა",signOutFailed:"გასვლა ვერ მოხდა"},le={home:"მთავარი",homeA11y:"მთავარი გვერდი",projects:"პროექტები",projectsA11y:"პროექტების სია",calendar:"კალენდარი",calendarA11y:"კალენდარი — განრიგი",regulations:"რეგულაციები",regulationsA11y:"რეგულაციები და სტანდარტები",more:"მეტი",moreA11y:"დამატებითი მენიუ",backToHome:"მთავარ გვერდზე",backToMore:"მეტი"},de={brand:"Hubble",tagline:"შრომის უსაფრთხოების ექსპერტი",login:"შესვლა",register:"რეგისტრაცია",loginWithGoogle:"Google-ით შესვლა",registerWithGoogle:"Google-ით რეგისტრაცია",forgotPassword:"პაროლი დაგავიწყდა?",resetPassword:"პაროლის აღდგენა",resetSent:`პაროლის განახლების ბმული გაიგზავნა
{{email}}-ზე.`,resetInstructions:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.",sendLink:"გაგზავნა",enterValidEmail:"გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა",passwordMinLength:"პაროლი (მინ. {{min}} სიმბოლო)",emailPlaceholder:"you@example.com",firstName:"სახელი",lastName:"გვარი",firstNamePlaceholder:"გიორგი",lastNamePlaceholder:"ხელაძე",emailAlreadyInUse:"ესეთი უზერი არსებობს უკვე",emailAlreadyInUseDesc:"ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?",passwordWrong:"პაროლი არასწორია",accountNotFound:"ანგარიში ვერ მოიძებნა — შეამოწმეთ ელ-ფოსტა",tooManyAttemptsTitle:"ბევრჯერ ცადეთ?",tooManyAttemptsBody:"შესაძლოა პაროლი დაგავიწყდათ. გსურთ აღდგენა?",resetCta:"პაროლის აღდგენა",or:"ან",linkSent:"ბმული გაიგზავნა",linkSentBody:"შეამოწმეთ {{email}}. ბმულზე დაჭერით დაბრუნდებით აპლიკაციაში ახალი პაროლის შესაყვანად.",resetTitle:"პაროლის აღდგენა",resetSubtitle:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.",checkEmail:"შეამოწმეთ ელ-ფოსტა",verifyCodeSent:"დადასტურების ბმული გაიგზავნა {{email}}-ზე. დააჭირეთ ბმულს ელ-ფოსტაში, ან შეიყვანეთ კოდი ქვემოთ.",verifyConfirm:"დადასტურება",didntReceiveCode:"კოდი არ მიგიღიათ?",resend:"ხელახლა გაგზავნა",resendIn:"ხელახლა გაგზავნა ({{n}}წ)",codeSent:"კოდი გამოგზავნილია",codeExpired:"კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.",invalidCode:"არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ."},ce={greetingNight:"მოგესალმებით",greetingMorning:"დილა მშვიდობისა",greetingAfternoon:"გამარჯობა",greetingEvening:"საღამო მშვიდობისა",resumeDraft:"გააგრძელეთ დრაფტი",newInspection:"ახალი შემოწმების აქტი",chooseProjectStart:"აირჩიეთ პროექტი და დაიწყეთ",uploadCertificates:"ატვირთეთ სერტიფიკატები",certExpiring:"{{count}} სერტიფიკატი იწურება",certExpiringSuffix:"სერტიფიკატი იწურება",pdfIncluded:"PDF რეპორტს ავტომატურად ერთვის.",checkDeadlines:"შეამოწმეთ ვადები, სანამ ობიექტი არ გაჩერდება.",sectionProjects:"პროექტები",allProjects:"ყველა",newProject:"ახალი პროექტი",createFirst:"შექმენით პირველი",recentActivity:"ბოლო აქტივობა",recentActs:"ბოლო აქტები",fetchError:"მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ კავშირი და ჩამოათრიეთ განახლებისთვის",allActivity:"ყველა",startInspectionSheetTitle:"შემოწმების აქტის დაწყება",addNewProjectSheet:"ახალი პროექტის დამატება",noProjectsYet:"პროექტი ჯერ არ გაქვს",noProjectsHint:'შეეხეთ "ახალი პროექტის დამატება"',chooseTemplate:"აირჩიეთ შაბლონი",newProjectFormTitle:"ახალი პროექტი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",companyPlaceholder:"შემკვეთი",tipOfDay:"რჩევა დღისთვის",tip1:"ხარაჩოს ინსპექტირებამდე დარწმუნდით, რომ ქამარი და მუზარადი გაქვთ.",tip2:"ქარი 15 მ/წმ-ზე მეტი — შეაჩერეთ სიმაღლის სამუშაოები.",tip3:"ქამრის შემოწმების აქტი: შეამოწმეთ ნაკერები და ბალთები, არა მხოლოდ ზოლი.",tip4:"ფოტოები რეპორტს 3-ჯერ უფრო სანდოს ხდის — გადაიღეთ ყოველი ცვლილება.",tip5:"ხარაჩოს ფეხები უნდა იდგას მტკიცე, თანაბარ ზედაპირზე.",tip6:"ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა, ვიდრე ერთი.",tip7:"სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმეთ ფიცრის ლპობა.",relNow:"ახლა",relMinAgo:"{{n}} წთ. წინ",relHourAgo:"{{n}} სთ. წინ",relDayAgo:"{{n}} დღის წინ"},pe={title:"პროექტები",yourProjects:"შენი პროექტები",subtitle:"აქ ჩანს თქვენი ყველა მიმდინარე პროექტი",tapForDetails:"შეეხეთ პროექტს დეტალების სანახავად",addProject:"ახალი პროექტი",addProjectSubtitle:"დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად",yourProfile:"შენი პროფილი",profileSubtitle:"აქ არის შენი ხელმოწერა და პარამეტრები",noProjects:"ჯერ პროექტი არ არის",noProjectsHint:"შექმენით პირველი პროექტი და დაიწყეთ შემოწმების აქტები",createProject:"+ ახალი პროექტი",changePhoto:"სურათის შეცვლა",createButton:"შექმნა",clientPlaceholder:"შემკვეთი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",nameLabel:"სახელი",companyLabel:"კომპანია",addressLabel:"მისამართი",deleteConfirm:"{{name}} — ყველა შემოწმების აქტსთან ერთად წაიშლება. გავაგრძელოთ?",draft:"დრაფტი",completed:"დასრულდა",tourProjectInfo:"პროექტის ინფო",tourProjectInfoBody:"შეეხეთ ბარათს რედაქტირებისთვის",tourCrew:"მონაწილეები",tourCrewBody:"დაამატეთ გუნდი შემოწმების აქტის დაწყებამდე",tourFiles:"ბრძანებები",tourFilesBody:"აქ იქმნება ბრძანებები და ინახება ფაილები",tourHistory:"შემოწმების აქტები",tourHistoryBody:"თქვენი შემოწმების აქტების ისტორია",tourNewInspection:"ახალი შემოწმების აქტი",tourNewInspectionBody:"დააჭირეთ და დაიწყეთ ახალი შემოწმების აქტი",inspectorFallback:"ინსპექტორი",memberSaveError:"მონაწილე ვერ შეინახა",templateMissing:"შაბლონი არ არის",chooseTemplateTitle:"აირჩიეთ შაბლონი",cancelOption:"გაუქმება",noCompletedInspections:"ჯერ არ არის დასრულებული",logoUpdated:"ლოგო განახლდა",logoSaveFailed:"ლოგო ვერ შეინახა",logoRemove:"ლოგოს წაშლა",galleryAccessDenied:"გალერეაზე წვდომა აკრძალულია",uploaded:"აიტვირთა",fileOpenFailed:"ფაილი ვერ გაიხსნა",saved:"შენახულია",draftsSection:"დრაფტები",completedSection:"დასრულებული",questionnairesSection:"შემოწმების აქტები",participantsSection:"მონაწილეები",edit:"რედაქტირება"},ge={newTitle:"ახალი მონაწილე",editTitle:"მონაწილის რედაქტირება",fullNamePlaceholder:"გიორგი ხელაძე",phonePlaceholder:"+995 5XX XX XX XX",positionPlaceholder:"მაგ. ზედამხედველი",noSignature:"ხელმოწერა შენახული არ არის",drawSignature:"ხელმოწერის დახატვა",redrawSignature:"ხელახლა დახატვა",signatureField:"ხელმოწერა",addButton:"დამატება",saveButton:"შენახვა",clearButton:"გასუფთავება",added:"დაემატა",updated:"განახლდა"},ue={title:"შემოწმების აქტი",backTitle:"მთავარი",notFoundTitle:"შემოწმების აქტი ვერ მოიძებნა",notFoundDesc:"შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.",statusSafe:"✓ უსაფრთხოა",statusProblems:"⚠ გამოვლენილია პრობლემები",problemsSection:"გამოვლენილი პრობლემები",checked:"შემოწმდა",problem:"პრობლემა",skipped:"გამოტოვდა",participants:"მონაწილეები",signed:"ხელი მოწერილი",notPresent:"არ ესწრებოდა",pdfGenerateAndSend:"PDF გენერირება და გაგზავნა",pdfPreview:"PDF პრევიუ",pdfReportsCount:"PDF რეპორტები ({{count}})",previewModalTitle:"PDF პრევიუ",previewLoading:"პრევიუ იტვირთება…",safe:"უსაფრთხოა",caution:"დასაშვებია, საჭიროებს დაკვირვებას",notSafe:"დაუშვებელია გამოყენება",remoteNotSent:"არ გაგზავნილა",remoteSent:"გაგზავნილია",remoteSigned:"ხელმოწერილი",remoteDeclined:"უარი თქვა",remoteExpired:"ვადაგასული",sendSms:"SMS-ის გაგზავნა",resendSms:"ხელახლა გაგზავნა",cancelRemote:"გაუქმება",wizardStepConclusion:"დასკვნა",wizardStepHarnessCount:"ქამარების რაოდენობა",wizardStepHarnessCheck:"ქამარების შემოწმება",wizardStepComponent:"კომპონენტი • {{row}}",wizardStepCheck:"შემოწმება",wizardStepMeasure:"გაზომვა",wizardStepNote:"შენიშვნა",wizardStepPhoto:"ფოტო",loadError:"არ მოიძებნა",answerFormatError:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",loadErrorWithDetail:"ჩატვირთვა ვერ მოხერხდა: {{detail}}",photoUploading:"ფოტოები იტვირთება ({{count}})…",photoUploadingSingle:"ფოტო იტვირთება…",footerComplete:"დასრულება",footerNextAnswered:"შემდეგი",footerNextUnanswered:"გამოტოვება",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleteCancel:"გაუქმება",deleteConfirm:"წაშლა",photoLabel:"ფოტო",noteLabel:"შენიშვნა",textPlaceholder:"შეავსეთ აქ...",missingSafetyStatus:"უსაფრთხოების სტატუსი",missingConclusion:"დასკვნა",missingHarnessName:"ქამრის დასახელება",completeError:"შემოწმების აქტის დასრულება ვერ მოხერხდა: {{detail}}",exitTitle:"გასვლა?",exitBody:"გასვლისას პასუხები შეინახება, მაგრამ შემოწმების აქტი არ დასრულდება.",exitStay:"გაგრძელება",exitLeave:"გასვლა",commentPlaceholder:"კომენტარი",additionalCommentPlaceholder:"დამატებითი კომენტარი (არასავალდებულო)",harnessModelPlaceholder:"მაგ. Petzl NEWTON",describeDetailedPlaceholder:"აღწერეთ დეტალურად...",viewPreview:"პრევიუს ნახვა",viewInspection:"შემოწმების აქტის ნახვა",backToHome:"მთავარ გვერდზე"},me={title:"PDF რეპორტები",emptyTitle:"PDF რეპორტი ჯერ არ გაქვთ",emptyHint:"დაასრულეთ შემოწმების აქტი და დააგენერირეთ პირველი PDF რეპორტი",emptyAction:"ახალი შემოწმების აქტი",pdfReport:"PDF რეპორტი",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",newTitle:"PDF რეპორტის გენერაცია",qualificationMissingTitle:"სერტიფიკატები არ არის",qualificationMissingDesc:"ატვირთეთ სერტიფიკატი ან ახლავე ატვირთეთ ახალი.",uploadAction:"ატვირთვა",noOtherQualifications:"სხვა სერტიფიკატები არ არის",inspectionLabel:"შემოწმების აქტი",chiefEngineer:"მთავარი ინჟინერი",safetySpecialist:"შრომის უსაფრთხოების სპეციალისტი",drawAction:"დახატვა",changeAction:"შეცვლა",signaturePlaceholder:"ხელმოწერა",otherSigners:"სხვა ხელმომწერები",signerSignatureOf:"{{name}}-ის ხელმოწერა",signatureRequired:"ხელმოწერა საჭიროა",addSignerOptional:"სურვილის შემთხვევაში — დაამატეთ სხვა ხელმომწერი",signerNamePlaceholder:"სახელი გვარი",enterNameFirst:"ჯერ შეიყვანეთ სახელი",newSigner:"ახალი ხელმომწერი",qualificationCerts:"სერტიფიკატები",notSelected:"არ არის არჩეული",uploaded:"ატვირთულია",certNumber:"№ {{number}}",changeCert:"შეცვლა",selectCert:"არჩევა",selectAllRequired:"არჩიე ყველა საჭირო სერტიფიკატი",additionalCerts:"დამატებითი სერტიფიკატები",addOtherQualifications:"სურვილის შემთხვევაში — დაამატეთ სხვა სერტიფიკატი",addButton:"+ დამატება",previewButton:"პრევიუ",generateButton:"PDF-ის გენერაცია",generateSuccess:"PDF რეპორტი შეიქმნა",assetsMissing:"{{count}} სურათი ვერ ჩაიდო — გამოჩნდება ჩანაცვლების ნიშნით.",previewFailedTitle:"პრევიუ ვერ აიწყო",sendSmsSuccess:"SMS გაიგზავნა",expertSignatureNeeded:'ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან',addLogoTitle:"ლოგოს დამატება",addLogoBody:"პროექტს ჯერ არ აქვს ლოგო. გსურთ მისი დამატება PDF-ის გენერაციამდე?",addLogoAdd:"დამატება",logoSaveFailed:"ლოგო ვერ შეინახა",localCopyMissing:'ამ მოწყობილობაზე ლოკალური ასლი არ არის. დააჭირეთ "გაზიარება".'},fe={title:"სერტიფიკატები",backTitle:"მეტი",requiredCerts:"სავალდებულო სერტიფიკატები",additionalCerts:"დამატებითი სერტიფიკატები"},he={title:"ისტორია",backTitle:"მეტი",draftsSection:"დრაფტები",completedSection:"დასრულებული",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",inspectionA11y:"შემოწმების აქტი",viewCompleted:"დასრულებული შემოწმების აქტის ნახვა",resumeDraft:"დრაფტის გაგრძელება",emptyTitle:"ისტორია ცარიელია",emptyHint:"დასრულებული შემოწმების აქტები გამოჩნდება აქ",startInspection:"შემოწმების აქტის დაწყება"},ve={title:"მეტი",projectsCount:"პროექტი",completedCount:"დასრულდა",draftCount:"დრაფტი",history:"ისტორია",lastInspection:"ბოლო: {{date}}",emptyLast:"ცარიელია",qualifications:"სერტიფიკატები",expiringCount:"{{count}} იწურება",uploadPrompt:"დააჭირეთ ასატვირთად",allActive:"ყველა აქტიური",templates:"შაბლონები",system:"სისტემა",regulations:"რეგულაციები",document:"დოკუმენტი",mySignature:"ჩემი ხელმოწერა",drawSignature:"ხელმოწერის დახატვა",terms:"წესები და პირობები",signOut:"გასვლა",privacyPolicy:"კონფიდენციალურობის პოლიტიკა",privacyNoShare:"Hubble არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.",privacyPhotos:"ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში",privacyPdf:"PDF რეპორტები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის",privacyDelete:"მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან",privacySupabase:"ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე",copyright:"© 2026 Hubble · ყველა უფლება დაცულია",settings:"პარამეტრები",darkMode:"მუქი რეჟიმი",language:"ენა / Language",pdfLanguage:"PDF ენა",changePassword:"პაროლის შეცვლა",signOutConfirmTitle:"გასვლა",signOutConfirmBody:"დარწმუნებული ხართ?"},be={title:"კალენდარი",sync:"სინქრონიზაცია",filterExpired:"ვადაგასული",filterThisWeek:"ამ კვირას",filterThisMonth:"ამ თვეში",prevMonth:"წინა თვე",nextMonth:"შემდეგი თვე",noTemplate:"შაბლონი არ არის",noProject:"პროექტი ვერ მოიძებნა",chooseTemplate:"აირჩიეთ შაბლონი",createFailed:"შექმნა ვერ მოხერხდა",connectGoogleFirst:"ჯერ მიაერთეთ Google კალენდარი",addedCount:"დაემატა: {{count}}",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",noInspections:"შემოწმების აქტი არ არის ამ დღეს.",today:"დღეს",start:"დაწყება",inspectionCount:"{{count}} შემოწმების აქტი",weekdayLabels:["ორშ","სამ","ოთხ","ხუთ","პარ","შაბ","კვ"],monthLabels:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],monthLabelsShort:["იან","თებ","მარ","აპრ","მაი","ივნ","ივლ","აგვ","სექ","ოქტ","ნოე","დეკ"],filterAll:"ყველა",filterInspection:"შემოწმება",filterBriefing:"ინსტრუქტაჟი",filterOverdue:"ვადა გასული",filterUpcoming:"დაგეგმილი",filterProject:"პროექტი",allProjects:"ყველა პროექტი",goToSite:"დღეს ობიექტზე ვარ",emptyDay:"ამ დღეს მოვლენები არ არის",emptyFilter:"ფილტრი — მოვლენები ვერ მოიძება",allCaughtUp:"ყველა ვადა დაცულია",overdueDays:"{{count}} დღე გადაცილდა",inDays:"{{count}} დღეში",dueToday:"დღეს",jumpToToday:"დღეს",upcomingSection:"შეხსენებები"},xe={title:"რეგულაციები",neverUpdated:"არასდროს",updatedToday:"დღეს, {{time}}",lastUpdate:"ბოლო განახლება: {{date}}",updatedBadge:"განახლდა",updatedDate:"განახლდა: {{date}}",openLinkA11y:"{{title}} — გახსნა",sourceLabel:"matsne.gov.ge"},ye={confirmKa:"დადასტურება",confirmEn:"Confirm",declineWarning:"უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.",cancelKa:"გაუქმება",cancelEn:"Cancel",signOutKa:"გასვლა",signOutEn:"Sign out",langKa:"ქართული",langEn:"English",viewInBrowser:"ვერსიის ნახვა ბრაუზერში",agree:"ვეთანხმები",disagree:"არ ვეთანხმები"},we={saved:"ხელმოწერა შენახულია",saveError:"შენახვა ვერ მოხერხდა",requiredTitle:"ხელმოწერა საჭიროა",requiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",eyebrow:"ხელმოწერა",fallbackName:"ხელმომწერი",signHereHint:"ხელი მოაწერეთ ჩარჩოში"},Se={title:"ხელმოწერის გარე მოთხოვნა",description:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",roleLabel:"როლი",nameLabel:"სახელი გვარი",namePlaceholder:"გიორგი ხელაძე",phoneLabel:"ტელეფონი",phonePlaceholder:"+995 5XX XXX XXX",cancel:"გაუქმება",sendSms:"SMS-ის გაგზავნა"},$e={rolePresets:["ზედამხედველი","ხარაჩოს ამწყობი"],addSheetTitle:"მონაწილის დამატება",nameLabel:"სახელი",namePlaceholder:"მაგ. გიორგი მელაძე",roleLabel:"როლი",saveButton:"შენახვა"},ke={topics:{scaffold_safety:"ხარაჩოს უსაფრთხოება",height_work:"სიმაღლეზე მუშაობა",ppe:"დამცავი აღჭურვილობა",evacuation:"საევაკუაციო გეგმა",fire_safety:"ხანძარსაწინააღმდეგო",other:"სხვა"}},Pe={tocTitle:"შინაარსი",tocQuestionCount:"{{count}} კითხვა",attachedCerts:"თანდართული სერტიფიკატები",certIssued:"გაცემა: {{date}}",certExpires:"ვადა: {{date}}",imageUnavailable:"სურათი მიუწვდომელია",statusNotSafe:"✗ დაუშვებელია გამოყენება",statusCaution:"⚠ დასაშვებია, საჭიროებს დაკვირვებას",statusSafe:"✓ უსაფრთხოა ექსპლუატაციისთვის",statusIncomplete:"● შეფასება დაუსრულებელია",watermarkDraft:"დრაფტი / DRAFT",previewBanner:"👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.",htmlTitle:"Hubble — {{templateName}}",systemName:"შრომის უსაფრთხოების ექსპერტული სისტემა",footerText:"Hubble · {{systemName}} · გვერდი ",metaDate:"თარიღი: {{date}}",metaObject:"ობიექტი: {{name}}",metaId:"ID: {{id}}",infoCompany:"კომპანია",infoObject:"ობიექტი",infoHarness:"ქამრის დასახელება",infoStatus:"სტატუსი",conclusionTitle:"დასკვნა",signaturesTitle:"ხელმოწერები",commentLabel:"კომენტარი",notesLabel:"შენიშვნა",photosTitle:"📷 ფოტო მასალა",yes:"კი",no:"არა",expertLabel:"ექსპერტი",timeLabel:"დრო",locationLabel:"ლოკაცია",deviceLabel:"მოწყობილობა",photoAlt:"ფოტო",signatureAlt:"ხელმოწერა"},Fe={statusBadgePass:"უსაფრთხოა",statusBadgeFail:"არ არის უსაფრთხო",statusBadgePending:"მოლოდინში",offlineBanner:"ხაზგარეშე — ცვლილებები ინახება ლოკალურად",errorStateTitle:"ვერ ჩაიტვირთა",errorStateRetry:"ხელახლა ცდა",errorBoundaryTitle:"მოხდა შეცდომა",errorBoundarySubtitle:"გთხოვთ, სცადოთ თავიდან",errorBoundaryRetry:"თავიდან ცდა",skeletonMapNoLocation:"ლოკაცია არ დაემატა",skeletonMapAddLocation:"ლოკაციის დამატება"},Ce={expert:"შრომის უსაფრთხოების სპეციალისტი",xarachoSupervisor:"ხარაჩოს ზედამხედველი",xarachoAssembler:"ხარაჩოს ამწყობი",other:"სხვა"},je={title:"ანგარიშის პარამეტრები",currentPassword:"მიმდინარე პაროლი",newPassword:"ახალი პაროლი",confirmNewPassword:"გაიმეორეთ ახალი პაროლი",passwordPlaceholder:"პაროლი",repeatPasswordPlaceholder:"გაიმეორეთ პაროლი",changePassword:"პაროლის შეცვლა",changing:"იცვლება…",currentPasswordRequired:"მიმდინარე პაროლი აუცილებელია",currentPasswordWrong:"მიმდინარე პაროლი არასწორია",passwordMinLengthError:"ახალი პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",passwordMustDiffer:"ახალი პაროლი უნდა იყოს განსხვავებული",passwordsMismatch:"პაროლები არ ემთხვევა",passwordCharCount:"{{n}}/{{min}} სიმბოლო",passwordChanged:"პაროლი შეიცვალა"},Te={title:"გვერდი არ მოიძებნა",body:"ეს გვერდი არ არსებობს ან წაშლილია.",backHome:"მთავარ გვერდზე"},De={common:oe,a11y:ne,errors:se,notifications:re,tabs:le,auth:de,home:ce,projects:pe,projectSigner:ge,inspections:ue,certificates:me,qualifications:fe,history:he,more:ve,calendar:be,regulations:xe,termsScreen:ye,signature:we,remoteSigner:Se,crew:$e,briefings:ke,pdf:Pe,components:Fe,roles:Ce,account:je,notFound:Te};function U(t,e){const s=t.split(".");let r=De;for(const l of s)if(r=r==null?void 0:r[l],r===void 0)break;if(typeof r=="string")return e?r.replace(/\{\{(\w+)\}\}/g,(l,d)=>String(e[d]??"")):r}function Ee(t){const e=new Date(t),s=String(e.getDate()).padStart(2,"0"),r=String(e.getMonth()+1).padStart(2,"0"),l=e.getFullYear(),d=String(e.getHours()).padStart(2,"0"),o=String(e.getMinutes()).padStart(2,"0");return`${s}.${r}.${l} ${d}:${o}`}function N(t){return String(t).padStart(2,"0")}function i(t){return t==null?"":t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Ae(t,e,s,r){var x,v;const l=i(s.slice(0,50)),d=t.created_at?Ee(t.created_at):"",o=d?`${l} — ${d}`:l,w=((x=t.caption)==null?void 0:x.startsWith("row:"))??!1,g=t.address??((v=t.caption)!=null&&v.startsWith("addr:")?t.caption.slice(5):null);let m="";g?m=`<div class="photo-caption photo-location">გადაღებულია: ${i(g)}</div>`:!w&&t.caption&&(m=`<div class="photo-caption">${i(t.caption)}</div>`);const a=t.storage_path,h=a.startsWith("data:"),C=/^(file|content|ph|asset):\/\//.test(a),j=/^https?:\/\//.test(a);return!h&&!C&&!j?`<div class="photo-item${e?" failed":""}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${r("pdf.imageUnavailable")}</div>
      </div>
      <div class="photo-caption">${o}</div>
      ${m}
    </div>`:`<div class="photo-item${e?" failed":""}">
    <div class="photo-img-wrap">
      <img src="${i(a)}" alt="${i(r("pdf.photoAlt"))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${i(r("pdf.imageUnavailable"))}</div>';" />
    </div>
    <div class="photo-caption">${o}</div>
    ${m}
  </div>`}function Le(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e):!1}function _e(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e)?"fail":/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(e)?"pass":/(არ გააჩნია|^na$|n\/a)/i.test(e)?"neutral":null:null}function O(t,e){return t==="pass"?"კი":t==="fail"?"არა":e&&/კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია|არა|fail|bad|no|broken|damaged|defect/i.test(e)?e:"—"}function ze(t,e,s=[],r=!1,l){const d=e!=null&&e.comment?`<div class="question-comment">${l("pdf.commentLabel")}: ${i(e.comment)}</div>`:"",o=e!=null&&e.notes?`<div class="question-notes">${l("pdf.notesLabel")}: ${i(e.notes)}</div>`:"",w=s.length===1?"photo-grid single":"photo-grid",g=s.length>0?`<div class="photo-section-title">${l("pdf.photosTitle")}</div>
         <div class="${w}">${s.map(a=>Ae(a,r,t.title,l)).join("")}</div>`:"",m=`question-card${r?" is-failed":""}`;switch(t.type){case"yesno":{const a=e==null?void 0:e.value_bool,h=a===!0?`<span class="answer-pill pill-yes">✓ ${l("pdf.yes")}</span>`:a===!1?`<span class="answer-pill pill-no">✗ ${l("pdf.no")}</span>`:'<span class="pill-empty">—</span>';return`<div class="${m}">
        <div class="question-title">${i(t.title)}</div>
        <div class="question-answer">${h}</div>
        ${d}${o}${g}
      </div>`}case"measure":{const a=e==null?void 0:e.value_num;return`<div class="${m}">
        <div class="question-title">${i(t.title)}</div>
        <div class="question-answer">${a??"—"} ${i(t.unit??"")}</div>
        ${d}${o}${g}
      </div>`}case"freetext":return`<div class="${m}">
        <div class="question-title">${i(t.title)}</div>
        <div class="question-answer">${i((e==null?void 0:e.value_text)??"—")}</div>
        ${d}${o}${g}
      </div>`;case"photo_upload":return`<div class="${m}">
        <div class="question-title">${i(t.title)}</div>
        ${g}${d}${o}
      </div>`;case"component_grid":{const a=t.grid_rows??[],h=t.grid_cols??[],C=(e==null?void 0:e.grid_values)??{},j=h.map(v=>`<th>${i(v)}</th>`).join(""),x=a.map(v=>{const y=h.map(k=>{var P;return((P=C[v])==null?void 0:P[k])??""}),$=y.some(k=>Le(k)),T=h.map((k,P)=>{const c=y[P],F=_e(c);return F==="pass"?`<td><span class="cell-status cell-status--pass">${i(O("pass",c))}</span></td>`:F==="fail"?`<td><span class="cell-status cell-status--fail">${i(O("fail",c))}</span></td>`:F==="neutral"?`<td><span class="cell-status cell-status--neutral">${i(O("neutral",c))}</span></td>`:`<td>${i(c)}</td>`}).join("");return`<tr${$?' class="is-problem"':""}><th>${i(v)}</th>${T}</tr>`}).join("");return`<div class="${m}">
        <div class="question-title">${i(t.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${j}</tr></thead>
            <tbody>${x}</tbody>
          </table>
        </div>
        ${d}${o}${g}
      </div>`}default:return""}}const Be=["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];function qe(t){const e=new Date(t);return Number.isNaN(e.getTime())?"":`${e.getDate()} ${Be[e.getMonth()]} ${e.getFullYear()}`}function He(t){if(!t)return"";const e=!!t.creatorSignature,s=Math.max(0,t.additionalRowsCount|0);if(!e&&s===0)return"";const r=U("pdf.signaturesTitle")??"ხელმოწერები",l=e?Ne(t.creatorSignature):"",d=s>0?Ie(s):"";return`
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${i(r)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${l}
      ${d}
    </div>
  `}function Ne(t){const e=qe(t.capturedAtIso);return`
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${i(t.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${i(t.creatorName||"—")}</span>
        ${e?`<span class="signatures-creator-date">${i(e)}</span>`:""}
      </div>
    </div>
  `}function Ie(t){const e=[];for(let s=0;s<t;s+=1)e.push(`
      <div class="signatures-empty-slot">
        <div class="signatures-empty-row">
          <span class="signatures-empty-label">ხელმოწერა:</span>
          <span class="signatures-empty-line signatures-empty-line-long"></span>
        </div>
        <div class="signatures-empty-row signatures-empty-row-split">
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">სახელი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">თარიღი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
        </div>
      </div>
    `);return e.join("")}function Me(t){if(t.logo)return`<img class="project-brand-logo" src="${i(t.logo)}" alt="${i(t.company_name||t.name)}" />`;const e=(t.company_name||t.name||"").trim(),s=e?Array.from(e).slice(0,2).join("").toLocaleUpperCase("ka-GE"):"—";return`<div class="project-brand-initials">${i(s)}</div>`}function Xe(t){const{isPdf:e}=t;return`
    :root {
      --green: #1D9E75;
      --green-dark: #147A4F;
      --green-tint: #E8F5F0;
      --red: #DC2626;
      --red-tint: #FCEBEB;
      --amber: #B45309;
      --amber-bg: #FEF3C7;
      --ink: #111827;
      --ink-soft: #4B5563;
      --gray: #9CA3AF;
      --line: #E5E7EB;
      --bg-soft: #FAFAFA;
      --radius: 8px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${e?"padding: 20px;":"padding: 16px;"}
      font-size: 11px;
    }

    /* @page margins removed — caused hangs on iOS WKWebView print renderer.
       Body padding (20px) provides sufficient margin instead. */

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 800;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 0;
      position: relative;
      z-index: 1;
    }
    .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
    .header-center {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 8px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.3;
    }
    .project-brand-logo {
      width: 60px; height: 60px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .project-brand-initials {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--green);
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: 1px;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 9px;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 4px;
    }
    .header-right {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .report-id {
      font-family: monospace;
      font-size: 10px;
      color: var(--gray);
      letter-spacing: 0.5px;
    }
    .header-rule {
      border: none;
      border-top: 3px solid var(--green);
      margin: 0 0 20px;
    }

    /* ── Info block ── */
    .info-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }

    /* ── Status Hero ── */
    .status-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      padding: 16px 20px;
      border-radius: var(--radius);
      color: #fff;
      margin-bottom: 16px;
      ${e?"page-break-inside: avoid;":""}
    }
    .hero-pass { background: var(--green); }
    .hero-fail { background: var(--red); }
    .hero-pending { background: var(--amber); }
    .status-hero-icon {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
    }
    .status-hero-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* Inline status badge (used inside conclusion card) */
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .status-pass { background: var(--green-tint); color: var(--green-dark); }
    .status-fail { background: var(--red-tint); color: var(--red); }
    .status-pending { background: var(--amber-bg); color: var(--amber); }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      min-width: 24px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 500; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin-bottom: 4px; margin-top: 8px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--green);
      padding-left: 10px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .section-num {
      color: var(--green);
      font-weight: 800;
    }
    .section-pipe { color: var(--green); font-weight: 700; margin: 0 2px; }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid #E8E6E0;
      border-radius: var(--radius);
      padding: 12px;
      margin-bottom: 8px;
      ${e?"page-break-inside: avoid;":""}
    }
    .question-card.is-failed {
      border-left: 3px solid var(--red);
    }
    .question-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .question-answer { font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
    .answer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .pill-yes { background: var(--green-tint); color: var(--green-dark); }
    .pill-no  { background: var(--red-tint); color: var(--red); }
    .pill-empty { color: var(--gray); font-style: italic; font-size: 12px; }

    .question-comment {
      font-size: 11px;
      color: var(--ink-soft);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: var(--bg-soft);
      border-radius: 6px;
      border-left: 3px solid var(--line);
    }
    .question-notes {
      font-size: 11px;
      color: var(--amber);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: #FFFBEB;
      border-radius: 6px;
      border-left: 3px solid #F59E0B;
    }

    /* ── Photo grid ── */
    .photo-section-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .photo-grid.single { grid-template-columns: 1fr; }
    .photo-item {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    .photo-img-wrap {
      width: 100%;
      max-height: 200px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 9px;
      color: var(--gray);
      text-align: center;
      padding: 5px 8px;
    }
    .photo-location {
      color: var(--ink-soft);
      font-style: italic;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: var(--bg-soft);
      font-size: 10px;
      color: var(--gray);
    }

    /* ── Component table ── */
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table thead th { background: #F5F3EE; color: var(--ink); }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }
    .data-table tbody th {
      background: var(--bg-soft);
      color: var(--ink);
      font-weight: 600;
    }
    .data-table td {
      padding: 8px 10px;
      border-top: 1px solid #F3F4F6;
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: #FAFAFA; }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Conclusion ── */
    .conclusion-card {
      background: #fff;
      border: 1px solid var(--line);
      border-left: 4px solid var(--green);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin: 16px 0;
      ${e?"page-break-inside: avoid;":""}
      position: relative;
      z-index: 1;
    }
    .conclusion-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--green);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .conclusion-text {
      font-size: 14px;
      color: var(--ink);
      line-height: 1.7;
      margin-bottom: 12px;
    }

    /* ── Signatures section (creator capture + empty hand-sign slots) ── */
    .signatures-section {
      position: relative;
      z-index: 1;
      margin-top: 24px;
      ${e?"page-break-inside: avoid;":""}
    }
    .signatures-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .signatures-heading-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-heading-rule { flex: 1; height: 1px; background: var(--line); }

    /* Creator (digital) block */
    .signatures-creator {
      margin-bottom: 18px;
    }
    .signatures-creator-img {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 4px 0;
    }
    .signatures-creator-img img {
      max-height: 100px;
      max-width: 280px;
      display: block;
    }
    .signatures-creator-rule {
      height: 1px;
      background: var(--ink);
      margin-bottom: 6px;
    }
    .signatures-creator-meta {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .signatures-creator-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-creator-date {
      font-size: 11px;
      color: var(--ink-soft);
    }

    /* Empty hand-sign slots */
    .signatures-empty-slot {
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }
    .signatures-empty-slot:first-child { border-top: none; }
    .signatures-empty-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 14px;
    }
    .signatures-empty-row:last-child { margin-bottom: 0; }
    .signatures-empty-row-split { gap: 28px; }
    .signatures-empty-half {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1;
    }
    .signatures-empty-label {
      font-size: 11px;
      color: var(--ink-soft);
      font-weight: 600;
      white-space: nowrap;
    }
    .signatures-empty-line {
      display: inline-block;
      border-bottom: 1px solid var(--ink);
      align-self: flex-end;
    }
    .signatures-empty-line-long {
      flex: 1;
      height: 80px;
    }
    .signatures-empty-line-short {
      flex: 1;
      height: 40px;
    }

    .audit-trail {
      font-size: 9px;
      color: var(--gray);
      margin-top: 8px;
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong { color: var(--ink-soft); font-weight: 600; }

    /* ── Certificates ── */
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cert-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${e?"page-break-inside: avoid;":""}
    }
    .cert-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 6px;
    }
    .cert-meta-row {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 2px;
    }
    .cert-meta-label { color: var(--gray); font-weight: 600; }
    .cert-img-wrap {
      position: relative;
      margin-top: 10px;
      width: 100%;
      /* padding-top % gives a 16:9 box in every engine; aspect-ratio is not
         honored by the expo-print/WKWebView print path and collapses to 0. */
      padding-top: 56.25%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--bg-soft);
    }
    .cert-img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .section, .signatures-section,
      .conclusion-card, .cert-card, .status-hero {
        page-break-inside: avoid;
      }
    }
`}function Re(t){var D;const{questionnaire:e,template:s,project:r,questions:l,answers:d,signaturesSession:o=null,photosByAnswer:w={},attachments:g=[],mode:m="pdf"}=t,a=(n,u)=>U(n,u)??n,h=m==="pdf",C=e.status!=="completed",j=n=>d.find(u=>u.question_id===n.id),x=e.created_at?new Date(e.created_at).toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}):"—",v=e.id.slice(0,8).toUpperCase();let y=null;e:for(const n of Object.values(w))for(const u of n){const f=u.address??((D=u.caption)!=null&&D.startsWith("addr:")?u.caption.slice(5):null);if(f){y=f;break e}}const $=Array.from(new Set(l.map(n=>n.section))).sort((n,u)=>n-u),T=$.map((n,u)=>{const f=l.filter(p=>p.section===n);return`<div class="toc-item"><span class="toc-num">${N(u+1)}</span><span class="toc-name">${i(String(n))}</span><span class="toc-count">${a("pdf.tocQuestionCount",{count:f.length})}</span></div>`}).join(""),A=$.map((n,u)=>{const f=l.filter(p=>p.section===n).sort((p,b)=>p.order-b.order).map(p=>{const b=j(p),I=b?w[b.id]??[]:[],M=(b==null?void 0:b.value_bool)===!1;return ze(p,b,I,M,a)}).join("");return`
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${N(u+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${i(String(n))}</span>
            </h2>
          </div>
          <div class="section-body">${f}</div>
        </div>
      `}).join(""),k=He(o),P=g.length>0?`
        <div class="section" ${h?'style="page-break-before: always;"':""}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${N($.length+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${a("pdf.attachedCerts")}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${g.map(n=>`
              <div class="cert-card">
                <div class="cert-title">${i(n.cert_type)}</div>
                ${n.cert_number?`<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${i(n.cert_number)}</div>`:""}
                ${n.photo_data_url?`<div class="cert-img-wrap">
                      <img src="${n.photo_data_url}" alt="${i(n.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${i(a("pdf.imageUnavailable"))}</div>';" />
                    </div>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `:"",c=e.safety_verdict??(e.is_safe_for_use===!0?"safe":e.is_safe_for_use===!1?"unsafe":null),F=c==="safe"?"hero-pass":c==="unsafe"?"hero-fail":"hero-pending",L=c==="safe"?"✓":c==="unsafe"?"✗":c==="caution"?"⚠":"…",_=a(c==="safe"?"pdf.statusSafe":c==="caution"?"pdf.statusCaution":c==="unsafe"?"pdf.statusNotSafe":"pdf.statusIncomplete"),z=`
    <div class="status-hero ${F}">
      <span class="status-hero-icon">${L}</span>
      <span class="status-hero-text">${_}</span>
    </div>
  `,B=c==="unsafe"?`<span class="status-badge status-fail">${a("pdf.statusNotSafe")}</span>`:c==="caution"?`<span class="status-badge status-pending">${a("pdf.statusCaution")}</span>`:c==="safe"?`<span class="status-badge status-pass">${a("pdf.statusSafe")}</span>`:`<span class="status-badge status-pending">${a("pdf.statusIncomplete")}</span>`,q=C?`<div class="watermark">${a("pdf.watermarkDraft")}</div>`:"";return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${a("pdf.htmlTitle",{templateName:i(s.name)})}</title>
  <style>${Xe({isPdf:h})}</style>
</head>
<body>
  ${q}

  <div class="report-header">
    <div class="header-left">
      ${Me(r)}
    </div>
    <div class="header-center">
      <div class="report-title">${i(s.name)}</div>
    </div>
    <div class="header-right">
      <div class="report-id">${v}</div>
    </div>
  </div>
  <hr class="header-rule" />

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${a("pdf.infoCompany")}</span>
      <span class="info-value">${i(r.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${a("pdf.infoObject")}</span>
      <span class="info-value">${i(r.address??"—")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${a("pdf.metaDate",{date:""}).replace(/[:：].*/,"").trim()||"თარიღი"}</span>
      <span class="info-value">${x}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${v}</span>
    </div>
    ${s.category==="harness"?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${a("pdf.infoHarness")}</span>
      <span class="info-value">${i(e.harness_name??"—")}</span>
    </div>`:""}
    ${y?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${i(y)}</span>
    </div>`:""}
  </div>

  ${z}

  <div class="toc-box">
    <div class="toc-heading">${a("pdf.tocTitle")}</div>
    ${T}
    ${g.length>0?`
    <div class="toc-item">
      <span class="toc-num">${N($.length+1)}</span>
      <span class="toc-name">${a("pdf.attachedCerts")}</span>
      <span class="toc-count">${g.length}</span>
    </div>`:""}
  </div>

  ${A}

  <div class="conclusion-card">
    <div class="conclusion-label">${a("pdf.conclusionTitle")}</div>
    <div class="conclusion-text">${i(e.conclusion_text??"—")}</div>
    ${B}
  </div>

  ${k}

  ${P}
</body>
</html>`}function Ve(){var F,L,_,z,B,q,D,n,u;const{id:t}=G(),[e]=Q(),s=e.get("preview")==="1",l=((F=K().state)==null?void 0:F.signaturesSession)??null,d=H.useRef(null),o=E({queryKey:R.detail(t),queryFn:()=>J(t),enabled:!!t}),w=E({queryKey:V.detail((L=o.data)==null?void 0:L.project_id),queryFn:()=>ee(o.data.project_id),enabled:!!((_=o.data)!=null&&_.project_id)}),g=E({queryKey:["template",(z=o.data)==null?void 0:z.template_id],queryFn:()=>te(o.data.template_id),enabled:!!((B=o.data)!=null&&B.template_id)}),m=E({queryKey:R.questions((q=o.data)==null?void 0:q.template_id),queryFn:()=>ae(o.data.template_id),enabled:!!((D=o.data)!=null&&D.template_id)}),a=E({queryKey:R.answers(t),queryFn:()=>ie(t),enabled:!!t}),[h,C]=H.useState({}),[j,x]=H.useState(!1);H.useEffect(()=>{if(!a.data)return;const f=a.data.map(p=>p.id);if(!f.length){x(!0);return}Y(f).then(async p=>{const b={};await Promise.all(Object.entries(p).map(async([I,M])=>{b[I]=await Promise.all(M.map(async X=>{try{const W=await Z(X.storage_path);return{...X,storage_path:W}}catch{return X}}))})),C(b),x(!0)}).catch(()=>x(!0))},[a.data]);const v=o.isSuccess&&w.isSuccess&&g.isSuccess&&m.isSuccess&&a.isSuccess&&j;if(o.isLoading)return S.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!o.data)return S.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!v)return S.jsx("p",{style:{padding:24},children:"იტვირთება…"});const y=o.data,$=w.data,T=g.data,A=m.data??[],k=a.data??[],P=T||{id:y.template_id,owner_id:null,name:"შემოწმების აქტი",category:((u=(n=y.template)==null?void 0:n[0])==null?void 0:u.category)??null,is_system:!1,required_qualifications:[],required_signer_roles:[]},c=Re({questionnaire:y,template:P,signaturesSession:l,project:$,questions:A,answers:k,photosByAnswer:h,mode:"pdf"});return S.jsxs(S.Fragment,{children:[S.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[S.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),S.jsx("button",{onClick:()=>{var f,p;return(p=(f=d.current)==null?void 0:f.contentWindow)==null?void 0:p.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),S.jsx("iframe",{ref:d,srcDoc:c,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:"შემოწმების აქტი",onLoad:()=>{var f,p;s||(p=(f=d.current)==null?void 0:f.contentWindow)==null||p.print()}})]})}export{Ve as default};
